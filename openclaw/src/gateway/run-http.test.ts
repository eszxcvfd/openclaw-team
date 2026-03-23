import { describe, expect, it, vi } from "vitest";

const handleGatewayPostJsonEndpointMock = vi.hoisted(() => vi.fn());
const agentCommandFromIngressMock = vi.hoisted(() => vi.fn());

vi.mock("./http-endpoint-helpers.js", () => ({
  handleGatewayPostJsonEndpoint: handleGatewayPostJsonEndpointMock,
}));

vi.mock("../commands/agent.js", () => ({
  agentCommandFromIngress: agentCommandFromIngressMock,
}));

vi.mock("../cli/deps.js", () => ({
  createDefaultDeps: () => ({}),
}));

vi.mock("../runtime.js", () => ({
  defaultRuntime: {},
}));

const { handleRunHttpRequest } = await import("./run-http.js");

function createResponseDouble() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(value?: string) {
      this.body = value ?? "";
    },
  };
}

describe("POST /run", () => {
  it("returns false when the endpoint helper does not match the path", async () => {
    handleGatewayPostJsonEndpointMock.mockResolvedValueOnce(false);

    const result = await handleRunHttpRequest(
      { headers: { host: "localhost" } } as never,
      createResponseDouble() as never,
      { auth: {} as never },
    );

    expect(result).toBe(false);
  });

  it("returns 400 for invalid request bodies", async () => {
    handleGatewayPostJsonEndpointMock.mockResolvedValueOnce({ body: { nope: true } });
    const res = createResponseDouble();

    const result = await handleRunHttpRequest(
      { headers: { host: "localhost" } } as never,
      res as never,
      { auth: {} as never },
    );

    expect(result).toBe(true);
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain("invalid_request_error");
  });

  it("dispatches a valid request through ingress agent command and returns text", async () => {
    handleGatewayPostJsonEndpointMock.mockResolvedValueOnce({
      body: {
        agentName: "learning_training_agent",
        message: "Generate a short quiz for me",
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
            tools: ["generate_quiz"],
            scopes: ["write:training"],
          },
        },
        internalToken: "internal-token",
        conversationId: "conv-1",
        userId: "user-1",
        traceId: "trace-1",
        backendBaseUrl: "http://backend:3001",
      },
    });
    agentCommandFromIngressMock.mockResolvedValueOnce({
      payloads: [{ text: "Quiz ready." }],
    });
    const res = createResponseDouble();

    const result = await handleRunHttpRequest(
      { headers: { host: "localhost" } } as never,
      res as never,
      { auth: {} as never },
    );

    expect(result).toBe(true);
    expect(agentCommandFromIngressMock).toHaveBeenCalledTimes(1);
    const ingressArgs = agentCommandFromIngressMock.mock.calls[0]?.[0] as {
      agentId?: string;
      executableTools?: Array<{ name: string }>;
      disableTools?: boolean;
      runtimeToolAllowlist?: string[];
    };
    expect(ingressArgs.agentId).toBe("learning_training_agent");
    expect(ingressArgs.disableTools).toBe(true);
    expect(ingressArgs.executableTools?.map((tool) => tool.name)).toEqual([
      "generate_quiz",
    ]);
    expect(ingressArgs.runtimeToolAllowlist).toEqual(["generate_quiz"]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Quiz ready.");
  });
});
