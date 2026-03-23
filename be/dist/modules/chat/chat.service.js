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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const rxjs_1 = require("rxjs");
const agent_router_service_1 = require("../agent-router/agent-router.service");
const internal_token_service_1 = require("../auth/internal-token.service");
const context_builder_service_1 = require("../context-builder/context-builder.service");
const openclaw_service_1 = require("../openclaw/openclaw.service");
const conversation_service_1 = require("./conversation.service");
let ChatService = class ChatService {
    conversationService;
    agentRouterService;
    contextBuilderService;
    internalTokenService;
    openclawService;
    constructor(conversationService, agentRouterService, contextBuilderService, internalTokenService, openclawService) {
        this.conversationService = conversationService;
        this.agentRouterService = agentRouterService;
        this.contextBuilderService = contextBuilderService;
        this.internalTokenService = internalTokenService;
        this.openclawService = openclawService;
    }
    async processMessage(userId, message, sessionKey) {
        const existingConversation = await this.conversationService.findConversationBySession(userId, sessionKey);
        const routedAgent = await this.agentRouterService.routeMessage({
            userId,
            message,
            currentAgentGroup: existingConversation?.agent_groups?.code ?? null,
        });
        const conversation = await this.conversationService.getOrCreateConversation(userId, routedAgent.agentGroup, sessionKey);
        await this.conversationService.saveMessage(conversation.id, 'user', message, userId);
        const promptContext = await this.contextBuilderService.build(userId, conversation.id, {
            agentGroup: routedAgent.agentGroup,
            allowedResources: routedAgent.allowedResources,
        });
        const eventStream = new rxjs_1.Subject();
        this.streamAgentResponse(conversation.id, userId, message, eventStream, promptContext, routedAgent.agentGroup, routedAgent.allowedResources.scopes);
        return eventStream.asObservable();
    }
    async streamAgentResponse(conversationId, userId, message, eventStream, promptContext, agentGroup, scopes) {
        const agentResponse = await this.buildAgentResponse({
            userId,
            message,
            promptContext,
            conversationId,
            agentGroup,
            scopes,
        });
        const uiPayload = agentResponse.uiPayload;
        const fullResponse = agentResponse.text ||
            'He thong da tiep nhan yeu cau cua ban nhung chua the sinh cau tra loi luc nay.';
        const words = fullResponse.split(' ');
        let currentText = '';
        for (let i = 0; i < words.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            currentText += (i === 0 ? '' : ' ') + words[i];
            eventStream.next({ data: { chunk: `${words[i]} `, full: currentText } });
        }
        if (uiPayload) {
            eventStream.next({
                data: {
                    uiPayload,
                },
            });
        }
        await this.conversationService.saveMessage(conversationId, 'assistant', fullResponse, undefined, this.buildAssistantMetadata(uiPayload, agentResponse));
        eventStream.complete();
    }
    async buildAgentResponse({ userId, message, promptContext, conversationId, agentGroup, scopes, }) {
        const traceId = (0, node_crypto_1.randomUUID)();
        try {
            const internalToken = await this.internalTokenService.createToken(agentGroup, userId, conversationId, scopes);
            const response = await this.openclawService.run({
                agentName: agentGroup,
                message,
                context: promptContext,
                internalToken,
                conversationId,
                userId,
                traceId,
                backendBaseUrl: this.resolveBackendBaseUrl(),
            });
            return {
                text: response.text ||
                    'Toi da xu ly yeu cau cua ban theo pham vi duoc phep.',
                uiPayload: response.uiPayload,
                orchestration: 'openclaw',
                traceId,
                agentName: agentGroup,
            };
        }
        catch {
            return {
                text: 'Khong the xu ly yeu cau qua OpenClaw luc nay. Vui long thu lai sau.',
                uiPayload: null,
                orchestration: 'openclaw-fallback',
                traceId,
                agentName: agentGroup,
            };
        }
    }
    buildAssistantMetadata(uiPayload, analyticsResponse) {
        const normalizedPayload = uiPayload && typeof uiPayload === 'object' && !Array.isArray(uiPayload)
            ? uiPayload
            : null;
        return JSON.parse(JSON.stringify({
            orchestration: analyticsResponse?.orchestration ?? 'mock',
            traceId: analyticsResponse?.traceId,
            agentName: analyticsResponse?.agentName,
            uiPayloadVersion: normalizedPayload?.version ?? null,
            uiPayload: normalizedPayload,
        }));
    }
    resolveBackendBaseUrl() {
        return process.env.APP_BASE_URL?.trim() || `http://localhost:${Number(process.env.PORT) || 3001}`;
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService,
        agent_router_service_1.AgentRouterService,
        context_builder_service_1.ContextBuilderService,
        internal_token_service_1.InternalTokenService,
        openclaw_service_1.OpenclawService])
], ChatService);
//# sourceMappingURL=chat.service.js.map