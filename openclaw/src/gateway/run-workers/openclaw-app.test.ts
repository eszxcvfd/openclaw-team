import { describe, expect, it } from "vitest";
import { prepareOpenClawWorkerRun } from "./openclaw-app.js";

describe("prepareOpenClawWorkerRun", () => {
  it("keeps only tools allowed by both agent registry and request allowlist", () => {
    const prepared = prepareOpenClawWorkerRun({
      agentName: "learning_training_agent",
      message: "Generate a quiz",
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
          agentGroup: "learning_training_agent",
          startedAt: "2026-03-23T00:00:00.000Z",
          messageCount: 1,
          recentTurns: [],
        },
        allowedResources: {
          documents: [],
          tools: ["generate_quiz", "get_department_training_analytics", "unknown_tool"],
          scopes: ["write:training"],
        },
      },
      internalToken: "internal-token",
      conversationId: "conv-1",
      userId: "user-1",
      traceId: "trace-1",
      backendBaseUrl: "http://backend:3001",
    });

    expect(prepared.tools.map((tool) => tool.name)).toEqual(["generate_quiz"]);
    expect(prepared.extraSystemPrompt).toContain("Allowed tools: generate_quiz, get_department_training_analytics, unknown_tool");
  });

  it("fails closed when the request tool allowlist is empty", () => {
    const prepared = prepareOpenClawWorkerRun({
      agentName: "onboarding_assistant",
      message: "What is left in my checklist?",
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
          messageCount: 1,
          recentTurns: [],
        },
        allowedResources: {
          documents: [],
          tools: [],
          scopes: ["read:onboarding"],
        },
      },
      internalToken: "internal-token",
      conversationId: "conv-1",
      userId: "user-1",
      traceId: "trace-1",
      backendBaseUrl: "http://backend:3001",
    });

    expect(prepared.tools).toEqual([]);
  });
});
