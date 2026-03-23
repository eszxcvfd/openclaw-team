import type { IncomingMessage, ServerResponse } from "node:http";
import { createDefaultDeps } from "../cli/deps.js";
import { agentCommandFromIngress } from "../commands/agent.js";
import { defaultRuntime } from "../runtime.js";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { sendJson } from "./http-common.js";
import { handleGatewayPostJsonEndpoint } from "./http-endpoint-helpers.js";
import { prepareOpenClawWorkerRun } from "./run-workers/openclaw-app.js";
import {
  OpenClawRunRequestSchema,
  type OpenClawRunRequest,
} from "./run-workers/registry.js";

const DEFAULT_BODY_BYTES = 2 * 1024 * 1024;

export async function handleRunHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: {
    auth: ResolvedGatewayAuth;
    trustedProxies?: string[];
    allowRealIpFallback?: boolean;
    rateLimiter?: AuthRateLimiter;
    maxBodyBytes?: number;
  },
): Promise<boolean> {
  const handled = await handleGatewayPostJsonEndpoint(req, res, {
    pathname: "/run",
    auth: opts.auth,
    trustedProxies: opts.trustedProxies,
    allowRealIpFallback: opts.allowRealIpFallback,
    rateLimiter: opts.rateLimiter,
    maxBodyBytes: opts.maxBodyBytes ?? DEFAULT_BODY_BYTES,
  });
  if (handled === false) {
    return false;
  }
  if (!handled) {
    return true;
  }

  const parsed = OpenClawRunRequestSchema.safeParse(handled.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid request body";
    sendJson(res, 400, {
      error: {
        type: "invalid_request_error",
        message,
      },
    });
    return true;
  }

  const request = parsed.data;
  const response = await runOpenClawBusinessWorker(request);
  sendJson(res, 200, response);
  return true;
}

async function runOpenClawBusinessWorker(request: OpenClawRunRequest) {
  const prepared = prepareOpenClawWorkerRun(request);
  const deps = createDefaultDeps();

  const result = await agentCommandFromIngress(
    {
      message: request.message,
      sessionKey: request.conversationId,
      runId: request.traceId,
      deliver: false,
      bestEffortDeliver: false,
      messageChannel: "backend",
      senderIsOwner: true,
      allowModelOverride: true,
      agentId: request.agentName,
      extraSystemPrompt: prepared.extraSystemPrompt,
      executableTools: prepared.tools,
      disableTools: true,
      runtimeToolAllowlist: prepared.tools.map((tool) => tool.name),
    },
    defaultRuntime,
    deps,
  );

  return {
    text: readFinalText(result),
    uiPayload: null,
  };
}

function readFinalText(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "";
  }

  const record = result as {
    payloads?: Array<{ text?: string }>;
  };

  const texts = (record.payloads ?? [])
    .map((payload) => payload.text?.trim())
    .filter((value): value is string => Boolean(value));

  return texts.join("\n\n").trim();
}
