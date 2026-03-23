export type BackendRunContext = {
  agentName: string;
  backendBaseUrl: string;
  internalToken: string;
  conversationId: string;
  userId: string;
  traceId: string;
  allowedTools: string[];
};

const backendRunContextByRunId = new Map<string, BackendRunContext>();

export function registerBackendRunContext(runId: string, context: BackendRunContext) {
  if (!runId) {
    return;
  }

  backendRunContextByRunId.set(runId, context);
}

export function getBackendRunContext(runId: string | undefined | null) {
  if (!runId) {
    return undefined;
  }

  return backendRunContextByRunId.get(runId);
}

export function clearBackendRunContext(runId: string | undefined | null) {
  if (!runId) {
    return;
  }

  backendRunContextByRunId.delete(runId);
}
