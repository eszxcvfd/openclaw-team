import { z } from "zod";

export const OpenClawAppAgentNameSchema = z.enum([
  "onboarding_assistant",
  "learning_training_agent",
  "training_analytics_agent",
]);

export type OpenClawAppAgentName = z.infer<typeof OpenClawAppAgentNameSchema>;

const PromptUserSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().min(1),
  department: z.string().nullable(),
  position: z.string().nullable(),
  roles: z.array(z.string()),
});

const PromptRecentTurnSchema = z.object({
  id: z.string().min(1),
  senderType: z.string().min(1),
  content: z.string(),
  createdAt: z.string().min(1),
});

const PromptSessionSchema = z.object({
  conversationId: z.string().min(1),
  agentGroup: z.string().nullable(),
  startedAt: z.string().min(1),
  messageCount: z.number().int().nonnegative(),
  recentTurns: z.array(PromptRecentTurnSchema),
});

const AllowedResourcesSchema = z.object({
  documents: z.array(z.string()),
  tools: z.array(z.string()),
  scopes: z.array(z.string()),
});

export const OpenClawRunRequestSchema = z.object({
  agentName: OpenClawAppAgentNameSchema,
  message: z.string().min(1),
  context: z.object({
    user: PromptUserSchema,
    session: PromptSessionSchema,
    allowedResources: AllowedResourcesSchema,
  }),
  internalToken: z.string().min(1),
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  traceId: z.string().min(1),
  backendBaseUrl: z.string().url(),
});

export const OpenClawRunResponseSchema = z.object({
  text: z.string(),
  uiPayload: z.record(z.string(), z.unknown()).nullable(),
});

export type OpenClawRunRequest = z.infer<typeof OpenClawRunRequestSchema>;
export type OpenClawRunResponse = z.infer<typeof OpenClawRunResponseSchema>;

export type OpenClawBusinessAgentDefinition = {
  id: OpenClawAppAgentName;
  label: string;
  toolNames: string[];
  submodules: string[];
  systemPromptSections: string[];
};

const AGENT_REGISTRY: Record<OpenClawAppAgentName, OpenClawBusinessAgentDefinition> = {
  onboarding_assistant: {
    id: "onboarding_assistant",
    label: "Onboarding Assistant",
    toolNames: [
      "get_onboarding_faq",
      "get_support_contacts",
      "get_my_checklist",
      "complete_checklist_task",
    ],
    submodules: ["employee_guide", "onboarding_checklist", "new_hire_faq"],
    systemPromptSections: [
      "You are the onboarding assistant for the OpenClaw enterprise workflow.",
      "Stay within onboarding scope: first-day guidance, FAQ, checklist progress, policy support contacts.",
      "Use backend wrapper tools instead of inventing business data.",
    ],
  },
  learning_training_agent: {
    id: "learning_training_agent",
    label: "Learning & Training Agent",
    toolNames: [
      "get_training_recommendations",
      "get_my_learning_path",
      "generate_learning_path",
      "generate_quiz",
    ],
    submodules: ["training_recommendation", "learning_path", "quiz_generator"],
    systemPromptSections: [
      "You are the learning and training assistant for the OpenClaw enterprise workflow.",
      "Stay within training scope: recommendations, learning path guidance, and quiz generation.",
      "Use backend wrapper tools for user-specific training state.",
    ],
  },
  training_analytics_agent: {
    id: "training_analytics_agent",
    label: "Training Analytics Agent",
    toolNames: ["get_department_training_analytics"],
    submodules: ["feedback_analysis", "progress_tracking", "training_report"],
    systemPromptSections: [
      "You are the training analytics assistant for the OpenClaw enterprise workflow.",
      "Stay within analytics scope: department-level training progress and summary reporting.",
      "Use backend wrapper tools for analytics data; do not invent metrics.",
    ],
  },
};

export function getBusinessAgentDefinition(
  agentName: OpenClawAppAgentName,
): OpenClawBusinessAgentDefinition {
  return AGENT_REGISTRY[agentName];
}

export function buildBusinessAgentSystemPrompt(agentName: OpenClawAppAgentName): string {
  const definition = getBusinessAgentDefinition(agentName);
  return definition.systemPromptSections.join("\n\n");
}
