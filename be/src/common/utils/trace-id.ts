import { randomUUID } from 'node:crypto';

import { Request, Response } from 'express';

type TraceAwareRequest = Request & { traceId?: string };

export function resolveTraceId(request: Request, response?: Response) {
  const traceAwareRequest = request as TraceAwareRequest;
  const headerValue = request.headers['x-trace-id'];
  const traceIdFromHeader =
    typeof headerValue === 'string'
      ? headerValue
      : Array.isArray(headerValue)
        ? headerValue[0]
        : undefined;

  const traceId = traceIdFromHeader?.trim() || traceAwareRequest.traceId || randomUUID();

  traceAwareRequest.traceId = traceId;
  response?.setHeader('X-Trace-Id', traceId);

  return traceId;
}
