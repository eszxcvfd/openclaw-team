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
var ToolCallLoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCallLoggerService = void 0;
const common_1 = require("@nestjs/common");
const trace_id_1 = require("../../common/utils/trace-id");
const tool_call_log_metadata_resolver_1 = require("./tool-call-log-metadata.resolver");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
let ToolCallLoggerService = ToolCallLoggerService_1 = class ToolCallLoggerService {
    prisma;
    metadataResolver;
    logger = new common_1.Logger(ToolCallLoggerService_1.name);
    constructor(prisma, metadataResolver) {
        this.prisma = prisma;
        this.metadataResolver = metadataResolver;
    }
    async logGuardDenial({ request, error, requiredScopes, startedAt, verifiedPayload, }) {
        const traceId = (0, trace_id_1.resolveTraceId)(request, request.res);
        const errorContext = this.extractErrorContext(error);
        await this.safePersist(async () => {
            const metadata = await this.metadataResolver.resolve(request, verifiedPayload?.agent);
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
    async logExecutionResult({ request, responsePayload, error, startedAt, verifiedPayload, }) {
        const traceId = (0, trace_id_1.resolveTraceId)(request, request.res);
        const errorContext = error ? this.extractErrorContext(error) : null;
        await this.safePersist(async () => {
            const metadata = await this.metadataResolver.resolve(request, verifiedPayload?.agent);
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
                    response_payload: this.serializeJson(errorContext
                        ? {
                            error: errorContext.payload,
                        }
                        : responsePayload ?? {}),
                    http_status: errorContext?.status ?? request.res?.statusCode ?? 200,
                    success: !error,
                    error_message: errorContext?.message ?? null,
                    started_at: startedAt,
                    finished_at: new Date(),
                },
            });
        });
    }
    async safePersist(operation) {
        try {
            await operation();
        }
        catch (error) {
            this.logger.error('Failed to persist internal tool audit log.', error);
        }
    }
    buildRequestPayload(request, metadata, requiredScopes) {
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
    extractAuditHeaders(request) {
        return {
            agentName: this.readHeader(request, 'x-agent-name'),
            userId: this.readHeader(request, 'x-user-id'),
            conversationId: this.readHeader(request, 'x-conversation-id'),
            traceId: this.readHeader(request, 'x-trace-id'),
        };
    }
    extractErrorContext(error) {
        if (!(error instanceof common_1.HttpException)) {
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
        const responsePayload = typeof response === 'object' && response !== null
            ? response
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
                code: typeof responsePayload.code === 'string'
                    ? responsePayload.code
                    : this.defaultCode(error.getStatus()),
                message: normalizedMessage,
                details: responsePayload.details ?? {},
            },
        };
    }
    defaultCode(status) {
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
    readHeader(request, key) {
        const headerValue = request.headers[key];
        if (typeof headerValue === 'string') {
            return headerValue;
        }
        if (Array.isArray(headerValue)) {
            return headerValue[0] ?? null;
        }
        return null;
    }
    resolveUserId(request) {
        return typeof request.user?.userId === 'string' ? request.user.userId : null;
    }
    serializeJson(value) {
        return this.serializeUnknown(value);
    }
    serializeUnknown(value) {
        if (value === undefined) {
            return {};
        }
        return JSON.parse(JSON.stringify(value));
    }
};
exports.ToolCallLoggerService = ToolCallLoggerService;
exports.ToolCallLoggerService = ToolCallLoggerService = ToolCallLoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tool_call_log_metadata_resolver_1.ToolCallLogMetadataResolver])
], ToolCallLoggerService);
//# sourceMappingURL=tool-call-logger.service.js.map