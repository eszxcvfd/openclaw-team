import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "../../agents/tools/common.js";
import { jsonResult, ToolInputError } from "../../agents/tools/common.js";
import type { OpenClawAppAgentName, OpenClawRunRequest } from "./registry.js";

const EmptyObjectSchema = Type.Object({}, { additionalProperties: false });
const CompleteChecklistTaskSchema = Type.Object({
  taskId: Type.String({ minLength: 1 }),
  note: Type.Optional(Type.String()),
});
const GenerateLearningPathSchema = Type.Object({
  targetLevel: Type.Optional(Type.String()),
  maxCourses: Type.Optional(Type.Number()),
  includeMandatoryCourses: Type.Optional(Type.Boolean()),
  queryText: Type.Optional(Type.String()),
});
const GenerateQuizSchema = Type.Object({
  templateId: Type.Optional(Type.String()),
  courseId: Type.Optional(Type.String()),
  queryText: Type.Optional(Type.String()),
  difficulty: Type.Optional(Type.String()),
  questionCount: Type.Optional(Type.Number()),
  questionTypes: Type.Optional(Type.Array(Type.String())),
});

type BackendToolRequestContext = Pick<
  OpenClawRunRequest,
  "backendBaseUrl" | "internalToken" | "conversationId" | "traceId" | "userId"
> & {
  agentName: OpenClawAppAgentName;
};

type BackendRequestOptions = {
  path: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown> | undefined;
};

async function callBackendToolApi<T>(
  context: BackendToolRequestContext,
  options: BackendRequestOptions,
): Promise<T> {
  const url = `${context.backendBaseUrl.replace(/\/$/, "")}${options.path}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${context.internalToken}`,
      "X-Agent-Name": context.agentName,
      "X-User-Id": context.userId,
      "X-Conversation-Id": context.conversationId,
      "X-Trace-Id": context.traceId,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: { message?: string; code?: string };
  };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message ?? `Backend tool request failed (${response.status})`);
  }

  return payload.data as T;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readRequiredString(params: Record<string, unknown>, key: string): string {
  const value = params[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ToolInputError(`${key} required`);
  }
  return value.trim();
}

export function createBackendWrapperTools(context: BackendToolRequestContext): AnyAgentTool[] {
  return [
    {
      label: "Onboarding FAQ",
      name: "get_onboarding_faq",
      description: "Get onboarding FAQ items from backend internal API.",
      parameters: EmptyObjectSchema,
      execute: async () =>
        jsonResult(
          await callBackendToolApi(context, {
            path: "/internal/tools/onboarding/faq",
          }),
        ),
    },
    {
      label: "Support Contacts",
      name: "get_support_contacts",
      description: "Get onboarding support contacts from backend internal API.",
      parameters: EmptyObjectSchema,
      execute: async () =>
        jsonResult(
          await callBackendToolApi(context, {
            path: "/internal/tools/onboarding/contacts/support",
          }),
        ),
    },
    {
      label: "My Checklist",
      name: "get_my_checklist",
      description: "Get the current user's onboarding checklist.",
      parameters: EmptyObjectSchema,
      execute: async () =>
        jsonResult(
          await callBackendToolApi(context, {
            path: "/internal/tools/onboarding/me/checklist",
          }),
        ),
    },
    {
      label: "Complete Checklist Task",
      name: "complete_checklist_task",
      description: "Mark an onboarding checklist task complete.",
      parameters: CompleteChecklistTaskSchema,
      execute: async (_toolCallId, args) => {
        const params = requireRecord(args);
        const taskId = readRequiredString(params, "taskId");
        const note = typeof params.note === "string" ? params.note : undefined;
        return jsonResult(
          await callBackendToolApi(context, {
            path: `/internal/tools/onboarding/me/checklist/${taskId}/complete`,
            method: "POST",
            body: note ? { note } : {},
          }),
        );
      },
    },
    {
      label: "Training Recommendations",
      name: "get_training_recommendations",
      description: "Get the current user's training recommendations.",
      parameters: EmptyObjectSchema,
      execute: async () =>
        jsonResult(
          await callBackendToolApi(context, {
            path: "/internal/tools/training/me/training-recommendations",
          }),
        ),
    },
    {
      label: "My Learning Path",
      name: "get_my_learning_path",
      description: "Get the current user's learning path.",
      parameters: EmptyObjectSchema,
      execute: async () =>
        jsonResult(
          await callBackendToolApi(context, {
            path: "/internal/tools/training/me/learning-path",
          }),
        ),
    },
    {
      label: "Generate Learning Path",
      name: "generate_learning_path",
      description: "Generate a learning path via backend internal API.",
      parameters: GenerateLearningPathSchema,
      execute: async (_toolCallId, args) =>
        jsonResult(
          await callBackendToolApi(context, {
            path: "/internal/tools/training/me/learning-path/generate",
            method: "POST",
            body: requireRecord(args),
          }),
        ),
    },
    {
      label: "Generate Quiz",
      name: "generate_quiz",
      description: "Generate a training quiz via backend internal API.",
      parameters: GenerateQuizSchema,
      execute: async (_toolCallId, args) =>
        jsonResult(
          await callBackendToolApi(context, {
            path: "/internal/tools/training/quiz/generate",
            method: "POST",
            body: requireRecord(args),
          }),
        ),
    },
    {
      label: "Department Training Analytics",
      name: "get_department_training_analytics",
      description: "Get department training analytics summary.",
      parameters: EmptyObjectSchema,
      execute: async () =>
        jsonResult(
          await callBackendToolApi(context, {
            path: "/internal/tools/analytics/training/department",
          }),
        ),
    },
  ];
}
