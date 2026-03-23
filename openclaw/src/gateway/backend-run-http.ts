import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { clearBackendRunContext, registerBackendRunContext } from "../backend-orchestration/run-context.js";
import { agentCommandFromIngress } from "../commands/agent.js";
import { buildAgentMainSessionKey } from "../routing/session-key.js";
import { isLocalDirectRequest, type ResolvedGatewayAuth } from "./auth.js";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import { authorizeGatewayBearerRequestOrReply } from "./http-auth-helpers.js";
import { readJsonBodyOrError, sendJson, sendMethodNotAllowed, sendUnauthorized } from "./http-common.js";
import { getBearerToken } from "./http-utils.js";

type BackendRunHttpOptions = {
  auth: ResolvedGatewayAuth;
  trustedProxies?: string[];
  allowRealIpFallback?: boolean;
  rateLimiter?: AuthRateLimiter;
};

type BackendRunRequest = {
  agentName: string;
  message: string;
  context?: {
    allowedResources?: {
      tools?: string[];
    };
  };
  internalToken: string;
  conversationId: string;
  userId: string;
  traceId?: string;
  backendBaseUrl: string;
};

const DOMAIN_TOOL_ALLOWLIST: Record<string, string[]> = {
  onboarding_assistant: [
    "get_onboarding_faq",
    "get_support_contacts",
    "get_my_checklist",
    "complete_checklist_task",
  ],
  learning_training_agent: [
    "get_training_recommendations",
    "get_my_learning_path",
    "generate_learning_path",
    "generate_quiz",
  ],
  training_analytics_agent: ["get_department_training_analytics"],
};

function extractTextFromResult(result: unknown) {
  const payloads = (result as { payloads?: Array<{ text?: unknown }> } | null)?.payloads;
  if (!Array.isArray(payloads)) {
    return "";
  }

  return payloads
    .map((payload) => (typeof payload?.text === "string" ? payload.text.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

function buildDomainPrompt(request: BackendRunRequest, allowedTools: string[]) {
  return [
    `You are ${request.agentName}.`,
    "You are invoked only by the backend orchestrator.",
    "Use only the provided backend business tools when they materially improve correctness.",
    "Never invent permissions or data not returned by tools.",
    "If a tool is unavailable, answer conservatively and explain the limitation.",
    `Allowed backend tools: ${allowedTools.join(", ") || "none"}.`,
    "Return a concise final answer for the end user in plain text.",
  ].join("\n");
}

function isValidRunRequest(body: unknown): body is BackendRunRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }

  const record = body as Record<string, unknown>;
  return [
    typeof record.agentName === "string" && record.agentName.trim(),
    typeof record.message === "string" && record.message.trim(),
    typeof record.internalToken === "string" && record.internalToken.trim(),
    typeof record.conversationId === "string" && record.conversationId.trim(),
    typeof record.userId === "string" && record.userId.trim(),
    typeof record.backendBaseUrl === "string" && record.backendBaseUrl.trim(),
  ].every(Boolean);
}

async function authorizeBackendRunRequest(params: {
  req: IncomingMessage;
  res: ServerResponse;
  auth: ResolvedGatewayAuth;
  trustedProxies?: string[];
  allowRealIpFallback?: boolean;
  rateLimiter?: AuthRateLimiter;
}) {
  const apiKey = process.env.OPENCLAW_API_KEY?.trim();
  const bearerToken = getBearerToken(params.req);

  if (apiKey) {
    if (bearerToken === apiKey) {
      return true;
    }

    if (isLocalDirectRequest(params.req, params.trustedProxies, params.allowRealIpFallback)) {
      return true;
    }

    sendUnauthorized(params.res);
    return false;
  }

  return await authorizeGatewayBearerRequestOrReply({
    req: params.req,
    res: params.res,
    auth: params.auth,
    trustedProxies: params.trustedProxies,
    allowRealIpFallback: params.allowRealIpFallback,
    rateLimiter: params.rateLimiter,
  });
}

export async function handleBackendRunHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: BackendRunHttpOptions,
) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname !== "/run") {
    return false;
  }

  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return true;
  }

  const authorized = await authorizeBackendRunRequest({
    req,
    res,
    auth: opts.auth,
    trustedProxies: opts.trustedProxies,
    allowRealIpFallback: opts.allowRealIpFallback,
    rateLimiter: opts.rateLimiter,
  });
  if (!authorized) {
    return true;
  }

  const body = await readJsonBodyOrError(req, res, 512_000);
  if (body === undefined) {
    return true;
  }

  if (!isValidRunRequest(body)) {
    sendJson(res, 400, {
      error: {
        message: "Invalid /run payload",
        type: "invalid_request_error",
      },
    });
    return true;
  }

  const request = body;
  const allowedByDomain = DOMAIN_TOOL_ALLOWLIST[request.agentName] ?? [];
  const allowedByBackend = request.context?.allowedResources?.tools ?? [];
  const allowedTools = allowedByDomain.filter((tool) => allowedByBackend.includes(tool));
  const runId = request.traceId?.trim() || randomUUID();
  const sessionKey = buildAgentMainSessionKey({
    agentId: request.agentName,
    mainKey: request.conversationId,
  });

  registerBackendRunContext(runId, {
    agentName: request.agentName,
    backendBaseUrl: request.backendBaseUrl,
    internalToken: request.internalToken,
    conversationId: request.conversationId,
    userId: request.userId,
    traceId: request.traceId?.trim() || runId,
    allowedTools,
  });

  try {
    const result = await agentCommandFromIngress({
      agentId: request.agentName,
      sessionKey,
      message: request.message,
      runId,
      deliver: false,
      messageChannel: "internal",
      extraSystemPrompt: buildDomainPrompt(request, allowedTools),
      senderIsOwner: false,
      allowModelOverride: false,
    });

    const text = extractTextFromResult(result);
    sendJson(res, 200, {
      text,
      uiPayload: null,
      data: {
        text,
      },
    });
    return true;
  } catch (error) {
    sendJson(res, 500, {
      error: {
        message: error instanceof Error ? error.message : String(error),
        type: "internal_error",
      },
    });
    return true;
  } finally {
    clearBackendRunContext(runId);
  }
}
