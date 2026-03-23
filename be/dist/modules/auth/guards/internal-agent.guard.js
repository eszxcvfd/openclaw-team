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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalAgentGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const tool_call_logger_service_1 = require("../../tool-gateway/tool-call-logger.service");
const internal_token_service_1 = require("../internal-token.service");
const agent_scope_decorator_1 = require("../decorators/agent-scope.decorator");
let InternalAgentGuard = class InternalAgentGuard {
    reflector;
    internalTokenService;
    toolCallLogger;
    constructor(reflector, internalTokenService, toolCallLogger) {
        this.reflector = reflector;
        this.internalTokenService = internalTokenService;
        this.toolCallLogger = toolCallLogger;
    }
    async canActivate(context) {
        const requiredScopes = this.reflector.getAllAndOverride(agent_scope_decorator_1.AGENT_SCOPE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const startedAt = new Date();
        let verifiedPayload;
        try {
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new common_1.UnauthorizedException('Missing or invalid internal agent token.');
            }
            const token = authHeader.split(' ')[1];
            verifiedPayload = await this.internalTokenService.verifyToken(token);
            this.assertHeaderMatchesPayload(request, verifiedPayload);
            this.assertOwnershipMatchesPayload(request, verifiedPayload);
            request.internalAgent = verifiedPayload;
            if (requiredScopes && requiredScopes.length > 0) {
                if (!verifiedPayload) {
                    throw new common_1.UnauthorizedException('Invalid or expired internal agent token.');
                }
                const payload = verifiedPayload;
                const hasAllScopes = requiredScopes.every((scope) => payload.scope.includes(scope));
                if (!hasAllScopes) {
                    throw new common_1.ForbiddenException({
                        code: 'TOOL_ACCESS_DENIED',
                        message: 'Agent lacks required scope for this tool.',
                        details: {
                            required: requiredScopes,
                            provided: payload.scope,
                        },
                    });
                }
            }
            return true;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                await this.toolCallLogger.logGuardDenial({
                    request,
                    error,
                    requiredScopes,
                    startedAt,
                    verifiedPayload,
                });
            }
            throw error;
        }
    }
    assertHeaderMatchesPayload(request, payload) {
        const agentNameHeader = this.readHeader(request.headers, 'x-agent-name');
        const userIdHeader = this.readHeader(request.headers, 'x-user-id');
        const conversationIdHeader = this.readHeader(request.headers, 'x-conversation-id');
        if (agentNameHeader && agentNameHeader !== payload.agent) {
            throw new common_1.ForbiddenException({
                code: 'TOOL_ACCESS_DENIED',
                message: 'Agent header does not match internal token payload.',
                details: {
                    headerAgent: agentNameHeader,
                    tokenAgent: payload.agent,
                },
            });
        }
        if (userIdHeader && userIdHeader !== payload.userId) {
            throw new common_1.ForbiddenException({
                code: 'FORBIDDEN',
                message: 'User header does not match internal token payload.',
                details: {
                    headerUserId: userIdHeader,
                    tokenUserId: payload.userId,
                },
            });
        }
        if (conversationIdHeader && conversationIdHeader !== payload.conversationId) {
            throw new common_1.ForbiddenException({
                code: 'FORBIDDEN',
                message: 'Conversation header does not match internal token payload.',
                details: {
                    headerConversationId: conversationIdHeader,
                    tokenConversationId: payload.conversationId,
                },
            });
        }
    }
    assertOwnershipMatchesPayload(request, payload) {
        const userIdCandidates = this.collectCandidates(request, [
            'userId',
            'user_id',
        ]);
        const conversationCandidates = this.collectCandidates(request, [
            'conversationId',
            'conversation_id',
        ]);
        if (userIdCandidates.some((candidate) => candidate && candidate !== payload.userId)) {
            throw new common_1.ForbiddenException({
                code: 'FORBIDDEN',
                message: 'Requested user data does not belong to the token user.',
                details: {
                    tokenUserId: payload.userId,
                    requestedUserIds: userIdCandidates,
                },
            });
        }
        if (conversationCandidates.some((candidate) => candidate && candidate !== payload.conversationId)) {
            throw new common_1.ForbiddenException({
                code: 'FORBIDDEN',
                message: 'Requested conversation does not belong to the token conversation.',
                details: {
                    tokenConversationId: payload.conversationId,
                    requestedConversationIds: conversationCandidates,
                },
            });
        }
    }
    collectCandidates(request, keys) {
        const sources = [request.params, request.query, request.body];
        return sources
            .flatMap((source) => keys
            .map((key) => source?.[key])
            .filter((value) => typeof value === 'string'));
    }
    readHeader(headers, key) {
        const value = headers?.[key];
        if (typeof value === 'string') {
            return value;
        }
        if (Array.isArray(value)) {
            return value[0];
        }
        return undefined;
    }
};
exports.InternalAgentGuard = InternalAgentGuard;
exports.InternalAgentGuard = InternalAgentGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        internal_token_service_1.InternalTokenService,
        tool_call_logger_service_1.ToolCallLoggerService])
], InternalAgentGuard);
//# sourceMappingURL=internal-agent.guard.js.map