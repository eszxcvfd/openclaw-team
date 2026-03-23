import { Type } from "@sinclair/typebox";
import { getBackendRunContext } from "../../backend-orchestration/run-context.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";

type BackendToolSpec = {
  name: string;
  description: string;
  method: "GET" | "POST";
  path: string | ((params: Record<string, unknown>) => string);
  parameters?: Record<string, unknown>;
  buildBody?: (params: Record<string, unknown>) => Record<string, unknown> | undefined;
};

const checklistUpdateSchema = Type.Object({
  taskId: Type.String(),
  note: Type.Optional(Type.String()),
});

const learningPathSchema = Type.Object({
  queryText: Type.Optional(Type.String()),
  includeMandatoryCourses: Type.Optional(Type.Boolean()),
});

const generateQuizSchema = Type.Object({
  queryText: Type.Optional(Type.String()),
  skillCode: Type.Optional(Type.String()),
  courseId: Type.Optional(Type.String()),
  difficulty: Type.Optional(Type.String()),
});

const TOOL_SPECS: BackendToolSpec[] = [
  {
    name: "get_onboarding_faq",
    description: "Read onboarding FAQ entries",
    method: "GET",
    path: "/internal/tools/onboarding/faq",
  },
  {
    name: "get_support_contacts",
    description: "Read onboarding support contacts",
    method: "GET",
    path: "/internal/tools/onboarding/contacts/support",
  },
  {
    name: "get_my_checklist",
    description: "Read current user onboarding checklist",
    method: "GET",
    path: "/internal/tools/onboarding/me/checklist",
  },
  {
    name: "complete_checklist_task",
    description: "Mark one onboarding checklist task complete",
    method: "POST",
    path: (params) => {
      const taskId = readStringParam(params, "taskId", { required: true });
      return `/internal/tools/onboarding/me/checklist/${encodeURIComponent(taskId)}/complete`;
    },
    parameters: checklistUpdateSchema,
    buildBody: (params) => ({
      note: readStringParam(params, "note"),
    }),
  },
  {
    name: "get_training_recommendations",
    description: "Read current user training recommendations",
    method: "GET",
    path: "/internal/tools/training/me/training-recommendations",
  },
  {
    name: "get_my_learning_path",
    description: "Read current user learning path",
    method: "GET",
    path: "/internal/tools/training/me/learning-path",
  },
  {
    name: "generate_learning_path",
    description: "Generate a new learning path",
    method: "POST",
    path: "/internal/tools/training/me/learning-path/generate",
    parameters: learningPathSchema,
    buildBody: (params) => ({
      queryText: readStringParam(params, "queryText"),
      includeMandatoryCourses: params.includeMandatoryCourses === true,
    }),
  },
  {
    name: "generate_quiz",
    description: "Generate a personalized training quiz",
    method: "POST",
    path: "/internal/tools/training/quiz/generate",
    parameters: generateQuizSchema,
    buildBody: (params) => ({
      queryText: readStringParam(params, "queryText"),
      skillCode: readStringParam(params, "skillCode"),
      courseId: readStringParam(params, "courseId"),
      difficulty: readStringParam(params, "difficulty"),
    }),
  },
  {
    name: "get_department_training_analytics",
    description: "Read department training analytics summary",
    method: "GET",
    path: "/internal/tools/analytics/training/department",
  },
];

function buildHeaders(params: {
  internalToken: string;
  agentName: string;
  userId: string;
  conversationId: string;
  traceId: string;
}) {
  return {
    Authorization: `Bearer ${params.internalToken}`,
    "Content-Type": "application/json",
    "X-Agent-Name": params.agentName,
    "X-User-Id": params.userId,
    "X-Conversation-Id": params.conversationId,
    "X-Trace-Id": params.traceId,
  };
}

function normalizeResponsePayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const record = payload as {
    success?: unknown;
    data?: unknown;
  };

  if (record.success === true && "data" in record) {
    return record.data;
  }

  return payload;
}

export function createBackendInternalTools(options: { runId?: string }): AnyAgentTool[] {
  const context = getBackendRunContext(options.runId);
  if (!context) {
    return [];
  }

  const allowedToolSet = new Set(context.allowedTools);

  return TOOL_SPECS.filter((tool) => allowedToolSet.has(tool.name)).map((tool) => ({
    label: tool.name,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    execute: async (_toolCallId, rawArgs) => {
      const args = rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
        ? (rawArgs as Record<string, unknown>)
        : {};
      const path = typeof tool.path === "function" ? tool.path(args) : tool.path;
      const response = await fetch(`${context.backendBaseUrl.replace(/\/$/, "")}${path}`, {
        method: tool.method,
        headers: buildHeaders(context),
        body:
          tool.method === "POST"
            ? JSON.stringify(tool.buildBody ? tool.buildBody(args) ?? {} : args)
            : undefined,
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(
          `Backend tool call failed (${tool.name}): ${response.status} ${JSON.stringify(payload)}`,
        );
      }

      return jsonResult(normalizeResponsePayload(payload));
    },
  }));
}
