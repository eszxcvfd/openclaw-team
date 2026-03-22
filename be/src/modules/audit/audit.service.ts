import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

type AuditListRow = {
  id: string;
  traceId: string;
  conversationId: string | null;
  resultStatus: 'success' | 'denied' | 'failed';
  success: boolean;
  httpStatus: number | null;
  eventTime: string;
  startedAt: string;
  finishedAt: string | null;
  user: {
    id: string | null;
    email: string | null;
    fullName: string | null;
    label: string;
  };
  tool: {
    id: string | null;
    code: string | null;
    name: string | null;
    label: string;
  };
  agentGroup: {
    id: string | null;
    code: string | null;
    name: string | null;
  };
  errorMessage: string | null;
};

type AuditListResponse = {
  items: AuditListRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type AuditDetailResponse = {
  id: string;
  traceId: string;
  conversationId: string | null;
  messageId: string | null;
  success: boolean;
  resultStatus: 'success' | 'denied' | 'failed';
  httpStatus: number | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  eventTime: string;
  user: {
    id: string | null;
    email: string | null;
    fullName: string | null;
    label: string;
  };
  tool: {
    id: string | null;
    code: string | null;
    name: string | null;
    label: string;
  };
  agentGroup: {
    id: string | null;
    code: string | null;
    name: string | null;
  };
  api: {
    id: string | null;
    code: string | null;
    method: string | null;
    path: string | null;
  };
  tokenScope: string[];
  context: {
    request: {
      method: string | null;
      normalizedPath: string | null;
      routePath: string | null;
      params: unknown;
      query: unknown;
      requiredScopes: string[];
    };
    authContext: {
      trusted: boolean;
      agent: string | null;
      untrustedHeaders: {
        agentName: string | null;
        userId: string | null;
        conversationId: string | null;
        traceId: string | null;
      } | null;
    };
    response: unknown;
    responseError: {
      code: string | null;
      message: string | null;
      details: unknown;
    } | null;
  };
};

type JsonRecord = Record<string, unknown>;

type AuditLogListRecord = Prisma.tool_call_logsGetPayload<{
  include: {
    users: true;
    tools: true;
    agent_groups: true;
  };
}>;

@Injectable()
export class AuditService {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(query: ListAuditLogsQueryDto): Promise<AuditListResponse> {
    const page = query.page ?? AuditService.DEFAULT_PAGE;
    const pageSize = query.pageSize ?? AuditService.DEFAULT_PAGE_SIZE;

    if (pageSize > AuditService.MAX_PAGE_SIZE) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `pageSize must be <= ${AuditService.MAX_PAGE_SIZE}`,
        details: {},
      });
    }

    const where = this.buildWhere(query);

    const [totalItems, rows] = await Promise.all([
      this.prisma.tool_call_logs.count({ where }),
      this.prisma.tool_call_logs.findMany({
        where,
        include: {
          users: true,
          tools: true,
          agent_groups: true,
        },
        orderBy: {
          started_at: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: rows.map((row) => this.mapListRow(row)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getAuditLogDetail(logId: string): Promise<AuditDetailResponse> {
    const row = await this.prisma.tool_call_logs.findUnique({
      where: {
        id: logId,
      },
      include: {
        users: true,
        tools: true,
        agent_groups: true,
        backend_api_catalog: true,
      },
    });

    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Audit log not found',
        details: {},
      });
    }

    const requestPayload = this.toRecord(row.request_payload);
    const responsePayload = this.toRecord(row.response_payload);
    const requestNode = this.toRecord(requestPayload.request);
    const authContextNode = this.toRecord(requestPayload.authContext);
    const responseErrorNode = this.toRecord(responsePayload.error);
    const untrustedHeadersNode = this.toRecord(authContextNode.untrustedHeaders);

    return {
      id: row.id,
      traceId: row.trace_id,
      conversationId: row.conversation_id,
      messageId: row.message_id,
      success: row.success,
      resultStatus: this.resolveResultStatus(row.success, row.http_status),
      httpStatus: row.http_status,
      errorMessage: row.error_message,
      startedAt: row.started_at.toISOString(),
      finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
      eventTime: this.resolveEventTime(row.started_at, row.finished_at),
      user: this.mapUser(row.user_id, row.users, requestPayload),
      tool: this.mapTool(row.tool_id, row.tools, requestPayload),
      agentGroup: {
        id: row.agent_group_id,
        code: row.agent_groups?.code ?? null,
        name: row.agent_groups?.name ?? null,
      },
      api: {
        id: row.api_id,
        code: row.backend_api_catalog?.code ?? null,
        method: row.backend_api_catalog?.http_method ?? null,
        path: row.backend_api_catalog?.path ?? null,
      },
      tokenScope: this.readStringArray(authContextNode.scope),
      context: {
        request: {
          method: this.readNullableString(requestNode.method),
          normalizedPath: this.readNullableString(requestNode.normalizedPath),
          routePath: this.readNullableString(requestNode.routePath),
          params: requestNode.params ?? {},
          query: requestNode.query ?? {},
          requiredScopes: this.readStringArray(requestNode.requiredScopes),
        },
        authContext: {
          trusted: this.readBoolean(authContextNode.trusted),
          agent: this.readNullableString(authContextNode.agent),
          untrustedHeaders: authContextNode.untrustedHeaders
            ? {
                agentName: this.readNullableString(untrustedHeadersNode.agentName),
                userId: this.readNullableString(untrustedHeadersNode.userId),
                conversationId: this.readNullableString(
                  untrustedHeadersNode.conversationId,
                ),
                traceId: this.readNullableString(untrustedHeadersNode.traceId),
              }
            : null,
        },
        response: row.response_payload,
        responseError: responseErrorNode
          ? {
              code: this.readNullableString(responseErrorNode.code),
              message: this.readNullableString(responseErrorNode.message),
              details: responseErrorNode.details ?? {},
            }
          : null,
      },
    };
  }

  private buildWhere(query: ListAuditLogsQueryDto): Prisma.tool_call_logsWhereInput {
    const where: Prisma.tool_call_logsWhereInput = {};
    const andConditions: Prisma.tool_call_logsWhereInput[] = [];

    if (query.success !== undefined) {
      where.success = query.success;
    }

    if (query.dateFrom || query.dateTo) {
      const startedAt: Prisma.DateTimeFilter = {};

      if (query.dateFrom) {
        startedAt.gte = new Date(query.dateFrom);
      }

      if (query.dateTo) {
        const endDate = new Date(query.dateTo);
        endDate.setUTCHours(23, 59, 59, 999);
        startedAt.lte = endDate;
      }

      where.started_at = startedAt;
    }

    if (query.trace && query.trace.trim().length > 0) {
      where.trace_id = {
        contains: query.trace.trim(),
        mode: 'insensitive',
      };
    }

    if (query.user && query.user.trim().length > 0) {
      const userTerm = query.user.trim();
      andConditions.push({
        OR: [
          {
            user_id: {
              equals: userTerm,
            },
          },
          {
            users: {
              is: {
                email: {
                  contains: userTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            users: {
              is: {
                full_name: {
                  contains: userTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            request_payload: {
              path: ['authContext', 'untrustedHeaders', 'userId'],
              string_contains: userTerm,
            },
          },
        ],
      });
    }

    if (query.tool && query.tool.trim().length > 0) {
      const toolTerm = query.tool.trim();
      andConditions.push({
        OR: [
          {
            tool_id: {
              equals: toolTerm,
            },
          },
          {
            tools: {
              is: {
                code: {
                  contains: toolTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            tools: {
              is: {
                name: {
                  contains: toolTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            request_payload: {
              path: ['request', 'normalizedPath'],
              string_contains: toolTerm,
            },
          },
          {
            request_payload: {
              path: ['request', 'routePath'],
              string_contains: toolTerm,
            },
          },
          {
            request_payload: {
              path: ['request', 'method'],
              string_contains: toolTerm,
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return where;
  }

  private mapListRow(
    row: AuditLogListRecord,
  ): AuditListRow {
    const requestPayload = this.toRecord(row.request_payload);

    return {
      id: row.id,
      traceId: row.trace_id,
      conversationId: row.conversation_id,
      resultStatus: this.resolveResultStatus(row.success, row.http_status),
      success: row.success,
      httpStatus: row.http_status,
      eventTime: this.resolveEventTime(row.started_at, row.finished_at),
      startedAt: row.started_at.toISOString(),
      finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
      user: this.mapUser(row.user_id, row.users, requestPayload),
      tool: this.mapTool(row.tool_id, row.tools, requestPayload),
      agentGroup: {
        id: row.agent_group_id,
        code: row.agent_groups?.code ?? null,
        name: row.agent_groups?.name ?? null,
      },
      errorMessage: row.error_message,
    };
  }

  private mapUser(
    userId: string | null,
    user: { email: string; full_name: string } | null,
    requestPayload: JsonRecord,
  ) {
    const untrusted = this.toRecord(
      this.toRecord(requestPayload.authContext).untrustedHeaders,
    );
    const fallbackHeaderUserId = this.readNullableString(untrusted.userId);

    return {
      id: userId,
      email: user?.email ?? null,
      fullName: user?.full_name ?? null,
      label:
        user?.full_name ??
        user?.email ??
        fallbackHeaderUserId ??
        'Unverified request',
    };
  }

  private mapTool(
    toolId: string | null,
    tool: { code: string; name: string } | null,
    requestPayload: JsonRecord,
  ) {
    const requestNode = this.toRecord(requestPayload.request);
    const method = this.readNullableString(requestNode.method);
    const normalizedPath = this.readNullableString(requestNode.normalizedPath);
    const routePath = this.readNullableString(requestNode.routePath);

    let fallbackLabel = 'Unknown tool';
    if (method && normalizedPath) {
      fallbackLabel = `${method} ${normalizedPath}`;
    } else if (routePath) {
      fallbackLabel = routePath;
    }

    return {
      id: toolId,
      code: tool?.code ?? null,
      name: tool?.name ?? null,
      label: tool?.name ?? tool?.code ?? fallbackLabel,
    };
  }

  private resolveResultStatus(success: boolean, httpStatus: number | null) {
    if (success) {
      return 'success' as const;
    }

    if (httpStatus === 401 || httpStatus === 403) {
      return 'denied' as const;
    }

    return 'failed' as const;
  }

  private resolveEventTime(startedAt: Date, finishedAt: Date | null) {
    return (finishedAt ?? startedAt).toISOString();
  }

  private toRecord(value: unknown): JsonRecord {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as JsonRecord;
  }

  private readNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private readBoolean(value: unknown): boolean {
    return typeof value === 'boolean' ? value : false;
  }

  private readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
