import { Request } from 'express';

import { InternalTokenPayload } from '../auth/internal-token.service';

export type InternalToolRequest = Request & {
  internalAgent?: InternalTokenPayload;
  traceId?: string;
  user?: {
    userId?: string;
  };
};

export interface ToolCallCatalogMetadata {
  normalizedPath: string;
  routePath: string;
  method: string;
  apiId: string | null;
  toolId: string | null;
  agentGroupId: string | null;
}

export interface GuardDenialLogInput {
  request: InternalToolRequest;
  error: unknown;
  requiredScopes?: string[];
  startedAt: Date;
  verifiedPayload?: InternalTokenPayload;
}

export interface ExecutionLogInput {
  request: InternalToolRequest;
  responsePayload?: unknown;
  error?: unknown;
  startedAt: Date;
  verifiedPayload?: InternalTokenPayload;
}
