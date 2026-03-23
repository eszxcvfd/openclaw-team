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
});
//# sourceMappingURL=training.internal.controller.spec.js.map