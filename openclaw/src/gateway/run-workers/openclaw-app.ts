import type { OpenClawRunRequest } from "./registry.js";
import {
  buildBusinessAgentSystemPrompt,
  getBusinessAgentDefinition,
  type OpenClawBusinessAgentDefinition,
} from "./registry.js";
import { createBackendWrapperTools } from "./backend-tools.js";

export type PreparedOpenClawWorkerRun = {
  definition: OpenClawBusinessAgentDefinition;
  extraSystemPrompt: string;
  tools: ReturnType<typeof createBackendWrapperTools>;
};

export function prepareOpenClawWorkerRun(request: OpenClawRunRequest): PreparedOpenClawWorkerRun {
  const definition = getBusinessAgentDefinition(request.agentName);
  const requestedToolAllowlist = new Set(request.context.allowedResources.tools);

  const extraSystemPrompt = [
    buildBusinessAgentSystemPrompt(request.agentName),
    `User: ${request.context.user.fullName} <${request.context.user.email}>`,
    `Roles: ${request.context.user.roles.join(", ") || "none"}`,
    `Conversation: ${request.context.session.conversationId}`,
    `Allowed tools: ${request.context.allowedResources.tools.join(", ") || "none"}`,
    `Allowed scopes: ${request.context.allowedResources.scopes.join(", ") || "none"}`,
  ].join("\n");

  return {
    definition,
    extraSystemPrompt,
    tools: createBackendWrapperTools({
      agentName: request.agentName,
      backendBaseUrl: request.backendBaseUrl,
      internalToken: request.internalToken,
      conversationId: request.conversationId,
      traceId: request.traceId,
      userId: request.userId,
    }).filter(
      (tool) =>
        definition.toolNames.includes(tool.name) && requestedToolAllowlist.has(tool.name),
    ),
  };
}
