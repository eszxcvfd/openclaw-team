"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
const training_controller_1 = require("./training.controller");
const training_service_1 = require("./training.service");
describe('TrainingController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        service = {
            submitQuizAttempt: jest.fn(),
            getQuizAttemptResult: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            controllers: [training_controller_1.TrainingController],
            providers: [
                {
                    provide: training_service_1.TrainingService,
                    useValue: service,
                },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();
        controller = module.get(training_controller_1.TrainingController);
    });
    it('should submit quiz attempts for the authenticated user only', async () => {
        const result = {
            attemptId: '550e8400-e29b-41d4-a716-446655440011',
            quizId: '550e8400-e29b-41d4-a716-446655440010',
            title: 'NodeJS Basics',
            difficulty: 'easy',
            course: null,
            score: 1,
            maxScore: 1,
            scorePercent: 100,
            correctCount: 1,
            totalQuestions: 1,
            durationSeconds: 32,
            submittedAt: '2026-03-23T01:00:00.000Z',
            questionResults: [],
        };
        service.submitQuizAttempt.mockResolvedValue(result);
        await expect(controller.submitQuiz({ user: { userId: 'user-1' } }, {
            quizId: '550e8400-e29b-41d4-a716-446655440010',
            assistantMessageId: '550e8400-e29b-41d4-a716-446655440013',
            durationSeconds: 32,
            answers: [
                {
                    questionId: '550e8400-e29b-41d4-a716-446655440012',
                    answer: 'node',
                },
            ],
        })).resolves.toEqual(result);
        expect(service.submitQuizAttempt).toHaveBeenCalledWith('user-1', {
            quizId: '550e8400-e29b-41d4-a716-446655440010',
            assistantMessageId: '550e8400-e29b-41d4-a716-446655440013',
            durationSeconds: 32,
            answers: [
                {
                    questionId: '550e8400-e29b-41d4-a716-446655440012',
                    answer: 'node',
                },
            ],
        });
    });
    it('should fetch quiz results for the authenticated user only', async () => {
        const result = {
            attemptId: '550e8400-e29b-41d4-a716-446655440011',
            quizId: '550e8400-e29b-41d4-a716-446655440010',
            title: 'NodeJS Basics',
            difficulty: 'easy',
            course: null,
            score: 1,
            maxScore: 1,
            scorePercent: 100,
            correctCount: 1,
            totalQuestions: 1,
            durationSeconds: 32,
            submittedAt: '2026-03-23T01:00:00.000Z',
            questionResults: [],
        };
        service.getQuizAttemptResult.mockResolvedValue(result);
        await expect(controller.getQuizResult({ user: { userId: 'user-1' } }, '550e8400-e29b-41d4-a716-446655440011')).resolves.toEqual(result);
        expect(service.getQuizAttemptResult).toHaveBeenCalledWith('user-1', '550e8400-e29b-41d4-a716-446655440011');
    });
    it('should validate attempt id values with ParseUUIDPipe', async () => {
        const pipe = new common_1.ParseUUIDPipe();
        await expect(pipe.transform('not-a-uuid', {
            type: 'param',
            metatype: String,
            data: 'id',
        })).rejects.toBeInstanceOf(common_1.BadRequestException);
    });
});
//# sourceMappingURL=training.controller.spec.js.map