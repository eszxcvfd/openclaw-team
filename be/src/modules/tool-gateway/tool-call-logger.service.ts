import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { resolveTraceId } from '../../common/utils/trace-id';
import {
  ExecutionLogInput,
  GuardDenialLogInput,
  InternalToolRequest,
} from './tool-call-log.types';
import { ToolCallLogMetadataResolver } from './tool-call-log-metadata.resolver';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class ToolCallLoggerService {
  private readonly logger = new Logger(ToolCallLoggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataResolver: ToolCallLogMetadataResolver,
  ) {}

  async logGuardDenial({
    request,
    error,
    requiredScopes,
    startedAt,
    verifiedPayload,
  }: GuardDenialLogInput) {
    const traceId = resolveTraceId(request, request.res);
    const errorContext = this.extractErrorContext(error);

    await this.safePersist(async () => {
      const metadata = await this.metadataResolver.resolve(
        request,
        verifiedPayload?.agent,
      );

      await this.prisma.tool_call_logs.create({
        data: {
          trace_id: traceId,
          conversation_id: verifiedPayload?.conversationId ?? null,
          message_id: null,
          agent_group_id: verifiedPayload ? metadata.agentGroupId : null,
          tool_id: metadata.toolId,
          api_id: metadata.apiId,
          user_id: verifiedPayload?.userId ?? this.resolveUserId(request),
          request_payload: this.serializeJson({
            request: this.buildRequestPayload(request, metadata, requiredScopes),
            authContext: {
              trusted: Boolean(verifiedPayload),
              untrustedHeaders: this.extractAuditHeaders(request),
            },
          }),
          response_payload: this.serializeJson({
            error: errorContext.payload,
          }),
          http_status: errorContext.status,
          success: false,
          error_message: errorContext.message,
          started_at: startedAt,
          finished_at: new Date(),
        },
      });
    });
  }

  async logExecutionResult({
    request,
    responsePayload,
    error,
    startedAt,
    verifiedPayload,
  }: ExecutionLogInput) {
    const traceId = resolveTraceId(request, request.res);
    const errorContext = error ? this.extractErrorContext(error) : null;

    await this.safePersist(async () => {
      const metadata = await this.metadataResolver.resolve(
        request,
        verifiedPayload?.agent,
      );

      await this.prisma.tool_call_logs.create({
        data: {
          trace_id: traceId,
          conversation_id: verifiedPayload?.conversationId ?? null,
          message_id: null,
          agent_group_id: metadata.agentGroupId,
          tool_id: metadata.toolId,
          api_id: metadata.apiId,
          user_id: verifiedPayload?.userId ?? this.resolveUserId(request),
          request_payload: this.serializeJson({
            request: this.buildRequestPayload(request, metadata),
            authContext: {
              trusted: true,
              agent: verifiedPayload?.agent ?? null,
              scope: verifiedPayload?.scope ?? [],
            },
          }),
          response_payload: this.serializeJson(
            errorContext
              ? {
                  error: errorContext.payload,
                }
              : responsePayload ?? {},
          ),
          http_status: errorContext?.status ?? request.res?.statusCode ?? 200,
          success: !error,
          error_message: errorContext?.message ?? null,
          started_at: startedAt,
          finished_at: new Date(),
        },
      });
    });
  }

  private async safePersist(operation: () => Promise<void>) {
    try {
      await operation();
    } catch (error) {
      this.logger.error('Failed to persist internal tool audit log.', error);
    }
  }

  private buildRequestPayload(
    request: InternalToolRequest,
    metadata: Awaited<ReturnType<ToolCallLogMetadataResolver['resolve']>>,
    requiredScopes?: string[],
  ) {
    return {
      method: metadata.method,
      normalizedPath: metadata.normalizedPath,
      routePath: metadata.routePath,
      params: this.serializeUnknown(request.params ?? {}),
      query: this.serializeUnknown(request.query ?? {}),
      body: this.serializeUnknown(request.body ?? {}),
      requiredScopes: requiredScopes ?? [],
    };
  }

  private extractAuditHeaders(request: InternalToolRequest) {
    return {
      agentName: this.readHeader(request, 'x-agent-name'),
      userId: this.readHeader(request, 'x-user-id'),
      conversationId: this.readHeader(request, 'x-conversation-id'),
      traceId: this.readHeader(request, 'x-trace-id'),
    };
  }

  private extractErrorContext(error: unknown) {
    if (!(error instanceof HttpException)) {
      return {
        status: 500,
        message: 'Internal server error',
        payload: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };
    }

    const response = error.getResponse();

    if (typeof response === 'string') {
      return {
        status: error.getStatus(),
        message: response,
        payload: {
          code: this.defaultCode(error.getStatus()),
          message: response,
          details: {},
        },
      };
    }

    const responsePayload =
      typeof response === 'object' && response !== null
        ? (response as Record<string, unknown>)
        : {};

    const message = responsePayload.message;
    const normalizedMessage = Array.isArray(message)
      ? message.join(', ')
      : typeof message === 'string'
        ? message
        : error.message;

    return {
      status: error.getStatus(),
      message: normalizedMessage,
      payload: {
        code:
          typeof responsePayload.code === 'string'
            ? responsePayload.code
            : this.defaultCode(error.getStatus()),
        message: normalizedMessage,
        details: responsePayload.details ?? {},
      },
    };
  }

  private defaultCode(status: number) {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  private readHeader(request: InternalToolRequest, key: string) {
    const headerValue = request.headers[key];

    if (typeof headerValue === 'string') {
      return headerValue;
    }

    if (Array.isArray(headerValue)) {
      return headerValue[0] ?? null;
    }

    return null;
  }

  private resolveUserId(request: InternalToolRequest) {
    return typeof request.user?.userId === 'string' ? request.user.userId : null;
  }

  private serializeJson(value: unknown): Prisma.InputJsonValue {
    return this.serializeUnknown(value) as Prisma.InputJsonValue;
  }

  private serializeUnknown(value: unknown): unknown {
    if (value === undefined) {
      return {};
    }

    return JSON.parse(JSON.stringify(value));
  }
}
