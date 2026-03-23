"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const constants_1 = require("@nestjs/common/constants");
const agent_scope_decorator_1 = require("../auth/decorators/agent-scope.decorator");
const internal_agent_guard_1 = require("../auth/guards/internal-agent.guard");
const training_internal_controller_1 = require("./training.internal.controller");
const training_service_1 = require("./training.service");
describe('TrainingInternalController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        service = {
            generateQuizForUser: jest.fn(),
            getTrainingRecommendationsForUser: jest.fn(),
            getLearningPathForUser: jest.fn(),
            generateLearningPathForUser: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            controllers: [training_internal_controller_1.TrainingInternalController],
            providers: [
                {
                    provide: training_service_1.TrainingService,
                    useValue: service,
                },
            ],
        })
            .overrideGuard(internal_agent_guard_1.InternalAgentGuard)
            .useValue({ canActivate: () => true })
            .compile();
        controller = module.get(training_internal_controller_1.TrainingInternalController);
    });
    it('should delegate quiz generation to training service with the token user id', async () => {
        const payload = {
            type: 'quiz',
            version: 1,
            quizId: '550e8400-e29b-41d4-a716-446655440010',
            templateCode: 'nodejs-basics',
            title: 'NodeJS Basics',
            difficulty: 'easy',
            course: null,
            questionCount: 1,
            questions: [],
        };
        service.generateQuizForUser.mockResolvedValue(payload);
        await expect(controller.generateQuiz({ internalAgent: { userId: 'user-1' } }, { difficulty: 'easy' })).resolves.toEqual(payload);
        expect(service.generateQuizForUser).toHaveBeenCalledWith('user-1', {
            difficulty: 'easy',
        });
    });
    it('should expose a guarded POST /quiz/generate route with training write scope', () => {
        expect(Reflect.getMetadata(constants_1.PATH_METADATA, training_internal_controller_1.TrainingInternalController)).toBe('internal/tools/training');
        expect(Reflect.getMetadata(constants_1.PATH_METADATA, training_internal_controller_1.TrainingInternalController.prototype.generateQuiz)).toBe('quiz/generate');
        expect(Reflect.getMetadata(constants_1.METHOD_METADATA, training_internal_controller_1.TrainingInternalController.prototype.generateQuiz)).toBe(common_1.RequestMethod.POST);
        expect(Reflect.getMetadata(constants_1.GUARDS_METADATA, training_internal_controller_1.TrainingInternalController.prototype.generateQuiz)).toContain(internal_agent_guard_1.InternalAgentGuard);
        expect(Reflect.getMetadata(agent_scope_decorator_1.AGENT_SCOPE_KEY, training_internal_controller_1.TrainingInternalController.prototype.generateQuiz)).toEqual(['write:training']);
    });
    it('should expose a guarded GET /me/training-recommendations route with training read scope', async () => {
        const payload = [{ courseId: 'course-1', title: 'Node.js Intermediate', reason: 'Gap', priority: 1 }];
        service.getTrainingRecommendationsForUser.mockResolvedValue(payload);
        await expect(controller.getTrainingRecommendations({ internalAgent: { userId: 'user-1' } })).resolves.toEqual(payload);
        expect(service.getTrainingRecommendationsForUser).toHaveBeenCalledWith('user-1');
        expect(Reflect.getMetadata(constants_1.PATH_METADATA, training_internal_controller_1.TrainingInternalController.prototype.getTrainingRecommendations)).toBe('me/training-recommendations');
        expect(Reflect.getMetadata(constants_1.METHOD_METADATA, training_internal_controller_1.TrainingInternalController.prototype.getTrainingRecommendations)).toBe(common_1.RequestMethod.GET);
        expect(Reflect.getMetadata(agent_scope_decorator_1.AGENT_SCOPE_KEY, training_internal_controller_1.TrainingInternalController.prototype.getTrainingRecommendations)).toEqual(['read:training']);
    });
    it('should expose a guarded GET /me/learning-path route with training read scope', async () => {
        const payload = { id: 'path-1', name: 'Backend Path', generated: true, items: [] };
        service.getLearningPathForUser.mockResolvedValue(payload);
        await expect(controller.getLearningPath({ internalAgent: { userId: 'user-1' } })).resolves.toEqual(payload);
        expect(service.getLearningPathForUser).toHaveBeenCalledWith('user-1');
        expect(Reflect.getMetadata(constants_1.PATH_METADATA, training_internal_controller_1.TrainingInternalController.prototype.getLearningPath)).toBe('me/learning-path');
        expect(Reflect.getMetadata(constants_1.METHOD_METADATA, training_internal_controller_1.TrainingInternalController.prototype.getLearningPath)).toBe(common_1.RequestMethod.GET);
        expect(Reflect.getMetadata(agent_scope_decorator_1.AGENT_SCOPE_KEY, training_internal_controller_1.TrainingInternalController.prototype.getLearningPath)).toEqual(['read:training']);
    });
    it('should expose a guarded POST /me/learning-path/generate route with training write scope', async () => {
        const payload = { id: 'path-1', name: 'Backend Path', generated: true, items: [] };
        service.generateLearningPathForUser.mockResolvedValue(payload);
        await expect(controller.generateLearningPath({ internalAgent: { userId: 'user-1' } }, { targetLevel: 'intern' })).resolves.toEqual(payload);
        expect(service.generateLearningPathForUser).toHaveBeenCalledWith('user-1', {
            targetLevel: 'intern',
        });
        expect(Reflect.getMetadata(constants_1.PATH_METADATA, training_internal_controller_1.TrainingInternalController.prototype.generateLearningPath)).toBe('me/learning-path/generate');
        expect(Reflect.getMetadata(constants_1.METHOD_METADATA, training_internal_controller_1.TrainingInternalController.prototype.generateLearningPath)).toBe(common_1.RequestMethod.POST);
        expect(Reflect.getMetadata(agent_scope_decorator_1.AGENT_SCOPE_KEY, training_internal_controller_1.TrainingInternalController.prototype.generateLearningPath)).toEqual(['write:training']);
    });
});
//# sourceMappingURL=training.internal.controller.spec.js.map