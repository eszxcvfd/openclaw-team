"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const context_builder_service_1 = require("../context-builder/context-builder.service");
const training_service_1 = require("../training/training.service");
const chat_service_1 = require("./chat.service");
const conversation_service_1 = require("./conversation.service");
describe('ChatService', () => {
    let service;
    let conversationService;
    let contextBuilderService;
    let trainingService;
    beforeEach(async () => {
        jest.useFakeTimers();
        conversationService = {
            getOrCreateConversation: jest.fn(),
            saveMessage: jest.fn(),
        };
        contextBuilderService = {
            build: jest.fn(),
        };
        trainingService = {
            generateQuizForUser: jest.fn(),
            generateLearningPathForUser: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                chat_service_1.ChatService,
                {
                    provide: conversation_service_1.ConversationService,
                    useValue: conversationService,
                },
                {
                    provide: context_builder_service_1.ContextBuilderService,
                    useValue: contextBuilderService,
                },
                {
                    provide: training_service_1.TrainingService,
                    useValue: trainingService,
                },
            ],
        }).compile();
        service = module.get(chat_service_1.ChatService);
    });
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });
    it('should build prompt context before completing the mock response', async () => {
        conversationService.getOrCreateConversation.mockResolvedValue({
            id: 'conv-1',
        });
        conversationService.saveMessage.mockResolvedValue(undefined);
        contextBuilderService.build.mockResolvedValue({
            user: { id: 'user-1' },
            session: { conversationId: 'conv-1' },
            allowedResources: { documents: [], tools: [], scopes: [] },
        });
        trainingService.generateQuizForUser.mockResolvedValue(null);
        const stream = await service.processMessage('user-1', 'Xin chao', 'session-1');
        const completion = new Promise((resolve, reject) => {
            stream.subscribe({
                complete: resolve,
                error: reject,
            });
        });
        await jest.runAllTimersAsync();
        await completion;
        expect(contextBuilderService.build).toHaveBeenCalledWith('user-1', 'conv-1');
        expect(conversationService.saveMessage).toHaveBeenNthCalledWith(1, 'conv-1', 'user', 'Xin chao', 'user-1');
        expect(conversationService.saveMessage).toHaveBeenLastCalledWith('conv-1', 'assistant', expect.any(String), undefined, {
            orchestration: 'mock',
            uiPayloadVersion: null,
            uiPayload: null,
        });
    });
    it('should emit and persist versioned quiz uiPayload metadata for quiz-like requests', async () => {
        conversationService.getOrCreateConversation.mockResolvedValue({
            id: 'conv-quiz',
        });
        conversationService.saveMessage.mockResolvedValue(undefined);
        contextBuilderService.build.mockResolvedValue({
            user: { id: 'user-1' },
            session: { conversationId: 'conv-quiz' },
            allowedResources: { documents: [], tools: [], scopes: [] },
        });
        trainingService.generateQuizForUser.mockResolvedValue({
            type: 'quiz',
            version: 1,
            quizId: 'quiz-1',
            templateCode: 'nodejs-basics',
            title: 'NodeJS Basics',
            difficulty: 'easy',
            course: null,
            questionCount: 1,
            questions: [],
        });
        const stream = await service.processMessage('user-1', 'Tao mini quiz NodeJS cho toi', 'session-quiz');
        const events = [];
        const completion = new Promise((resolve, reject) => {
            stream.subscribe({
                next: (event) => events.push(event),
                complete: resolve,
                error: reject,
            });
        });
        await jest.runAllTimersAsync();
        await completion;
        expect(trainingService.generateQuizForUser).toHaveBeenCalledWith('user-1', {
            queryText: 'Tao mini quiz NodeJS cho toi',
        });
        expect(events.some((event) => event?.data?.uiPayload?.type === 'quiz')).toBe(true);
        expect(conversationService.saveMessage).toHaveBeenLastCalledWith('conv-quiz', 'assistant', expect.stringContaining('mini quiz'), undefined, expect.objectContaining({
            orchestration: 'mock',
            uiPayloadVersion: 1,
            uiPayload: expect.objectContaining({
                type: 'quiz',
                quizId: 'quiz-1',
            }),
        }));
    });
    it('should emit and persist versioned learning-path uiPayload metadata for recommendation requests', async () => {
        conversationService.getOrCreateConversation.mockResolvedValue({
            id: 'conv-path',
        });
        conversationService.saveMessage.mockResolvedValue(undefined);
        contextBuilderService.build.mockResolvedValue({
            user: { id: 'user-1' },
            session: { conversationId: 'conv-path' },
            allowedResources: { documents: [], tools: [], scopes: [] },
        });
        trainingService.generateQuizForUser.mockResolvedValue(null);
        trainingService.generateLearningPathForUser.mockResolvedValue({
            id: 'path-1',
            name: 'Backend Intern Path',
            generated: true,
            summary: 'Bat dau voi Product Overview.',
            payload: {
                type: 'learning-path',
                version: 1,
                pathId: 'path-1',
                title: 'Backend Intern Path',
                description: 'Lo trinh hoc ca nhan hoa',
                contextLabel: 'Gap: Node.js',
                generated: true,
                items: [
                    {
                        orderNo: 1,
                        courseId: 'course-1',
                        courseCode: 'prod-overview',
                        courseTitle: 'Product Overview',
                        required: true,
                        reason: 'Mon nen tang bat buoc',
                        estimatedHours: 2,
                        status: 'not_started',
                    },
                ],
                summary: 'Bat dau voi Product Overview.',
            },
            items: [],
        });
        const stream = await service.processMessage('user-1', 'Toi nen hoc khoa nao truoc?', 'session-path');
        const events = [];
        const completion = new Promise((resolve, reject) => {
            stream.subscribe({
                next: (event) => events.push(event),
                complete: resolve,
                error: reject,
            });
        });
        await jest.runAllTimersAsync();
        await completion;
        expect(trainingService.generateLearningPathForUser).toHaveBeenCalledWith('user-1', {
            queryText: 'Toi nen hoc khoa nao truoc?',
            includeMandatoryCourses: true,
        });
        expect(events.some((event) => event?.data?.uiPayload?.type === 'learning-path')).toBe(true);
        expect(conversationService.saveMessage).toHaveBeenLastCalledWith('conv-path', 'assistant', expect.stringContaining('lo trinh'), undefined, expect.objectContaining({
            orchestration: 'mock',
            uiPayloadVersion: 1,
            uiPayload: expect.objectContaining({
                type: 'learning-path',
                pathId: 'path-1',
            }),
        }));
    });
});
//# sourceMappingURL=chat.service.spec.js.map