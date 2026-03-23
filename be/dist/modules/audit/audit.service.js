"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
let AuditService = class AuditService {
    static { AuditService_1 = this; }
    prisma;
    static DEFAULT_PAGE = 1;
    static DEFAULT_PAGE_SIZE = 20;
    static MAX_PAGE_SIZE = 100;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listAuditLogs(query) {
        const page = query.page ?? AuditService_1.DEFAULT_PAGE;
        const pageSize = query.pageSize ?? AuditService_1.DEFAULT_PAGE_SIZE;
        if (pageSize > AuditService_1.MAX_PAGE_SIZE) {
            throw new common_1.BadRequestException({
                code: 'VALIDATION_ERROR',
                message: `pageSize must be <= ${AuditService_1.MAX_PAGE_SIZE}`,
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
    async getAuditLogDetail(logId) {
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
            throw new common_1.NotFoundException({
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
                            conversationId: this.readNullableString(untrustedHeadersNode.conversationId),
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
    buildWhere(query) {
        const where = {};
        const andConditions = [];
        if (query.success !== undefined) {
            where.success = query.success;
        }
        if (query.dateFrom || query.dateTo) {
            const startedAt = {};
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
    mapListRow(row) {
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
    mapUser(userId, user, requestPayload) {
        const untrusted = this.toRecord(this.toRecord(requestPayload.authContext).untrustedHeaders);
        const fallbackHeaderUserId = this.readNullableString(untrusted.userId);
        return {
            id: userId,
            email: user?.email ?? null,
            fullName: user?.full_name ?? null,
            label: user?.full_name ??
                user?.email ??
                fallbackHeaderUserId ??
                'Unverified request',
        };
    }
    mapTool(toolId, tool, requestPayload) {
        const requestNode = this.toRecord(requestPayload.request);
        const method = this.readNullableString(requestNode.method);
        const normalizedPath = this.readNullableString(requestNode.normalizedPath);
        const routePath = this.readNullableString(requestNode.routePath);
        let fallbackLabel = 'Unknown tool';
        if (method && normalizedPath) {
            fallbackLabel = `${method} ${normalizedPath}`;
        }
        else if (routePath) {
            fallbackLabel = routePath;
        }
        return {
            id: toolId,
            code: tool?.code ?? null,
            name: tool?.name ?? null,
            label: tool?.name ?? tool?.code ?? fallbackLabel,
        };
    }
    resolveResultStatus(success, httpStatus) {
        if (success) {
            return 'success';
        }
        if (httpStatus === 401 || httpStatus === 403) {
            return 'denied';
        }
        return 'failed';
    }
    resolveEventTime(startedAt, finishedAt) {
        return (finishedAt ?? startedAt).toISOString();
    }
    toRecord(value) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return {};
        }
        return value;
    }
    readNullableString(value) {
        return typeof value === 'string' ? value : null;
    }
    readBoolean(value) {
        return typeof value === 'boolean' ? value : false;
    }
    readStringArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.filter((item) => typeof item === 'string');
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map