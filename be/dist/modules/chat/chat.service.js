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
const rxjs_1 = require("rxjs");
const context_builder_service_1 = require("../context-builder/context-builder.service");
const training_service_1 = require("../training/training.service");
const conversation_service_1 = require("./conversation.service");
let ChatService = class ChatService {
    conversationService;
    contextBuilderService;
    trainingService;
    constructor(conversationService, contextBuilderService, trainingService) {
        this.conversationService = conversationService;
        this.contextBuilderService = contextBuilderService;
        this.trainingService = trainingService;
    }
    async processMessage(userId, message, sessionKey) {
        const conversation = await this.conversationService.getOrCreateConversation(userId, undefined, sessionKey);
        await this.conversationService.saveMessage(conversation.id, 'user', message, userId);
        const promptContext = await this.contextBuilderService.build(userId, conversation.id);
        const eventStream = new rxjs_1.Subject();
        this.mockStreamingResponse(conversation.id, userId, message, eventStream, promptContext);
        return eventStream.asObservable();
    }
    async mockStreamingResponse(conversationId, userId, message, eventStream, promptContext) {
        const quizPayload = await this.buildQuizPayloadIfRequested(userId, message);
        const learningPath = quizPayload
            ? null
            : await this.buildLearningPathIfRequested(userId, message);
        const uiPayload = quizPayload ?? learningPath?.payload ?? null;
        const fullResponse = quizPayload
            ? 'Toi da tao mot mini quiz ngan de ban tu danh gia nhanh ngay trong khung chat nay.'
            : learningPath
                ? `Toi da goi y lo trinh hoc cho ban. ${learningPath.summary || ''}`.trim()
                : 'Chao ban! Toi la tro ly OpenClaw. He thong dang trong qua trinh hoan thien cac module nghiep vu. Toi co the giup gi cho ban hom nay?';
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
        await this.conversationService.saveMessage(conversationId, 'assistant', fullResponse, undefined, this.buildAssistantMetadata(uiPayload));
        eventStream.complete();
    }
    async buildQuizPayloadIfRequested(userId, message) {
        if (!this.looksLikeQuizRequest(message)) {
            return null;
        }
        try {
            return await this.trainingService.generateQuizForUser(userId, {
                queryText: message,
            });
        }
        catch {
            return null;
        }
    }
    async buildLearningPathIfRequested(userId, message) {
        if (!this.looksLikeLearningPathRequest(message)) {
            return null;
        }
        try {
            return await this.trainingService.generateLearningPathForUser(userId, {
                queryText: message,
                includeMandatoryCourses: true,
            });
        }
        catch {
            return null;
        }
    }
    looksLikeQuizRequest(message) {
        return /(quiz|trac nghiem|kiem tra|test)/i.test(message);
    }
    looksLikeLearningPathRequest(message) {
        return /(lo trinh|learning path|goi y hoc|nen hoc|khoa nao truoc|dao tao)/i.test(message);
    }
    buildAssistantMetadata(uiPayload) {
        const normalizedPayload = uiPayload && typeof uiPayload === 'object' && !Array.isArray(uiPayload)
            ? uiPayload
            : null;
        return JSON.parse(JSON.stringify({
            orchestration: 'mock',
            uiPayloadVersion: normalizedPayload?.version ?? null,
            uiPayload: normalizedPayload,
        }));
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService,
        context_builder_service_1.ContextBuilderService,
        training_service_1.TrainingService])
], ChatService);
//# sourceMappingURL=chat.service.js.map