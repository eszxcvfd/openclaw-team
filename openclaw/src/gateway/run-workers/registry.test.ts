import { describe, expect, it } from "vitest";
import {
  buildBusinessAgentSystemPrompt,
  getBusinessAgentDefinition,
  OpenClawRunRequestSchema,
} from "./registry.js";

describe("run worker registry", () => {
  it("validates the backend /run request payload", () => {
    const parsed = OpenClawRunRequestSchema.safeParse({
      agentName: "onboarding_assistant",
      message: "What remains on my checklist?",
      context: {
        user: {
          id: "user-1",
          fullName: "User One",
          email: "user@example.com",
          department: "Engineering",
          position: "Developer",
          roles: ["employee"],
        },
        session: {
          conversationId: "conv-1",
          agentGroup: "onboarding_assistant",
          startedAt: "2026-03-23T00:00:00.000Z",
          messageCount: 2,
          recentTurns: [],
        },
        allowedResources: {
          documents: [],
          tools: ["get_my_checklist"],
          scopes: ["read:checklist"],
        },
      },
      internalToken: "internal-token",
      conversationId: "conv-1",
      userId: "user-1",
      traceId: "trace-1",
      backendBaseUrl: "http://backend:3001",
    });

    expect(parsed.success).toBe(true);
  });

  it("returns the expected tool list for each business agent", () => {
    expect(getBusinessAgentDefinition("onboarding_assistant").toolNames).toContain(
      "get_my_checklist",
    );
    expect(getBusinessAgentDefinition("learning_training_agent").toolNames).toContain(
      "generate_quiz",
    );
    expect(getBusinessAgentDefinition("training_analytics_agent").toolNames).toEqual([
      "get_department_training_analytics",
    ]);
  });

  it("builds a system prompt that includes the agent framing", () => {
    expect(buildBusinessAgentSystemPrompt("training_analytics_agent")).toContain(
      "training analytics assistant",
    );
  });
});
