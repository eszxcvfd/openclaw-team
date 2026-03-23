"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const training_service_1 = require("./training.service");
describe('TrainingService', () => {
    let service;
    let prisma;
    beforeEach(async () => {
        prisma = {
            user_courses: {
                findMany: jest.fn(),
            },
            quiz_templates: {
                findMany: jest.fn(),
                findFirst: jest.fn(),
            },
            quiz_attempts: {
                create: jest.fn(),
                findFirst: jest.fn(),
            },
            messages: {
                findFirst: jest.fn(),
                update: jest.fn(),
            },
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                training_service_1.TrainingService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prisma,
                },
            ],
        }).compile();
        service = module.get(training_service_1.TrainingService);
    });
    describe('generateQuizForUser', () => {
        it('should return compact frontend-safe quiz payloads without answer keys', async () => {
            prisma.user_courses.findMany.mockResolvedValue([
                {
                    course_id: 'course-1',
                },
            ]);
            prisma.quiz_templates.findMany.mockResolvedValue([
                {
                    id: 'quiz-1',
                    code: 'nodejs-basics',
                    title: 'NodeJS Basics',
                    difficulty: 'easy',
                    question_count: 2,
                    courses: {
                        id: 'course-1',
                        code: 'nodejs-101',
                        title: 'NodeJS 101',
                        is_active: true,
                    },
                    quiz_questions: [
                        {
                            id: 'question-1',
                            question_type: 'single_choice',
                            question_text: 'What runtime powers Node.js?',
                            options_json: ['V8', 'JVM'],
                            answer_key_json: { answer: 'V8' },
                            score_weight: 2,
                        },
                        {
                            id: 'question-2',
                            question_type: 'true_false',
                            question_text: 'Node.js can run JavaScript outside the browser.',
                            options_json: [],
                            answer_key_json: { answer: true },
                            score_weight: 1,
                        },
                    ],
                },
            ]);
            await expect(service.generateQuizForUser('user-1', {
                queryText: 'NodeJS quiz',
                questionCount: 1,
            })).resolves.toEqual({
                type: 'quiz',
                version: 1,
                quizId: 'quiz-1',
                templateCode: 'nodejs-basics',
                title: 'NodeJS Basics',
                difficulty: 'easy',
                course: {
                    id: 'course-1',
                    code: 'nodejs-101',
                    title: 'NodeJS 101',
                },
                questionCount: 1,
                questions: [
                    {
                        id: 'question-1',
                        prompt: 'What runtime powers Node.js?',
                        type: 'single_choice',
                        options: [
                            { value: 'V8', label: 'V8' },
                            { value: 'JVM', label: 'JVM' },
                        ],
                        weight: 2,
                    },
                ],
            });
            expect(prisma.user_courses.findMany).toHaveBeenCalledWith({
                where: {
                    user_id: 'user-1',
                },
                select: {
                    course_id: true,
                },
            });
            expect(prisma.quiz_templates.findMany).toHaveBeenCalled();
        });
    });
    describe('submitQuizAttempt', () => {
        it('should grade answers, persist quiz_attempts, and return safe result data', async () => {
            prisma.messages.findFirst.mockResolvedValue({
                id: 'assistant-msg-1',
                metadata: {
                    uiPayload: {
                        type: 'quiz',
                        version: 1,
                        quizId: 'quiz-1',
                        title: 'NodeJS Basics',
                    },
                },
            });
            prisma.quiz_templates.findFirst.mockResolvedValue({
                id: 'quiz-1',
                code: 'nodejs-basics',
                title: 'NodeJS Basics',
                difficulty: 'easy',
                question_count: 2,
                courses: {
                    id: 'course-1',
                    code: 'nodejs-101',
                    title: 'NodeJS 101',
                    is_active: true,
                },
                quiz_questions: [
                    {
                        id: 'question-1',
                        question_type: 'single_choice',
                        question_text: 'What runtime powers Node.js?',
                        options_json: ['V8', 'JVM'],
                        answer_key_json: { answer: 'V8' },
                        score_weight: 2,
                    },
                    {
                        id: 'question-2',
                        question_type: 'multiple_choice',
                        question_text: 'Pick Node.js strengths',
                        options_json: ['Event loop', 'Blocking by default', 'npm'],
                        answer_key_json: { answers: ['Event loop', 'npm'] },
                        score_weight: 3,
                    },
                ],
            });
            prisma.quiz_attempts.create.mockResolvedValue({
                id: 'attempt-1',
                duration_seconds: 95,
                submitted_at: new Date('2026-03-23T02:00:00.000Z'),
                score: 5,
                submitted_answers: [
                    { questionId: 'question-1', answer: 'V8' },
                    { questionId: 'question-2', answer: ['npm', 'Event loop'] },
                ],
                quiz_templates: {
                    id: 'quiz-1',
                    code: 'nodejs-basics',
                    title: 'NodeJS Basics',
                    difficulty: 'easy',
                    question_count: 2,
                    courses: {
                        id: 'course-1',
                        code: 'nodejs-101',
                        title: 'NodeJS 101',
                        is_active: true,
                    },
                    quiz_questions: [
                        {
                            id: 'question-1',
                            question_type: 'single_choice',
                            question_text: 'What runtime powers Node.js?',
                            options_json: ['V8', 'JVM'],
                            answer_key_json: { answer: 'V8' },
                            score_weight: 2,
                        },
                        {
                            id: 'question-2',
                            question_type: 'multiple_choice',
                            question_text: 'Pick Node.js strengths',
                            options_json: ['Event loop', 'Blocking by default', 'npm'],
                            answer_key_json: { answers: ['Event loop', 'npm'] },
                            score_weight: 3,
                        },
                    ],
                },
            });
            await expect(service.submitQuizAttempt('user-1', {
                quizId: 'quiz-1',
                assistantMessageId: 'assistant-msg-1',
                durationSeconds: 95,
                answers: [
                    { questionId: 'question-1', answer: 'V8' },
                    { questionId: 'question-2', answer: ['npm', 'Event loop'] },
                ],
            })).resolves.toEqual({
                attemptId: 'attempt-1',
                quizId: 'quiz-1',
                title: 'NodeJS Basics',
                difficulty: 'easy',
                course: {
                    id: 'course-1',
                    code: 'nodejs-101',
                    title: 'NodeJS 101',
                },
                score: 5,
                maxScore: 5,
                scorePercent: 100,
                correctCount: 2,
                totalQuestions: 2,
                durationSeconds: 95,
                submittedAt: '2026-03-23T02:00:00.000Z',
                questionResults: [
                    {
                        questionId: 'question-1',
                        prompt: 'What runtime powers Node.js?',
                        type: 'single_choice',
                        selectedAnswer: 'V8',
                        isCorrect: true,
                        earnedScore: 2,
                        maxScore: 2,
                    },
                    {
                        questionId: 'question-2',
                        prompt: 'Pick Node.js strengths',
                        type: 'multiple_choice',
                        selectedAnswer: ['npm', 'Event loop'],
                        isCorrect: true,
                        earnedScore: 3,
                        maxScore: 3,
                    },
                ],
            });
            expect(prisma.quiz_attempts.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    user_id: 'user-1',
                    quiz_template_id: 'quiz-1',
                    duration_seconds: 95,
                    score: 5,
                    submitted_answers: [
                        { questionId: 'question-1', answer: 'V8' },
                        { questionId: 'question-2', answer: ['npm', 'Event loop'] },
                    ],
                    submitted_at: expect.any(Date),
                }),
                select: expect.any(Object),
            });
            expect(prisma.messages.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'assistant-msg-1',
                    sender_type: 'assistant',
                    conversations: {
                        is: {
                            user_id: 'user-1',
                        },
                    },
                },
                select: {
                    id: true,
                    metadata: true,
                },
            });
            expect(prisma.messages.update).toHaveBeenCalledWith({
                where: {
                    id: 'assistant-msg-1',
                },
                data: {
                    metadata: expect.objectContaining({
                        uiPayload: expect.objectContaining({
                            quizId: 'quiz-1',
                            result: expect.objectContaining({
                                attemptId: 'attempt-1',
                                quizId: 'quiz-1',
                                score: 5,
                                maxScore: 5,
                            }),
                        }),
                    }),
                },
            });
        });
        it('should reject duplicate submissions for an already-answered quiz card', async () => {
            prisma.messages.findFirst.mockResolvedValue({
                id: 'assistant-msg-1',
                metadata: {
                    uiPayload: {
                        type: 'quiz',
                        quizId: 'quiz-1',
                        result: {
                            attemptId: 'attempt-existing',
                        },
                    },
                },
            });
            await expect(service.submitQuizAttempt('user-1', {
                quizId: 'quiz-1',
                assistantMessageId: 'assistant-msg-1',
                answers: [{ questionId: 'question-1', answer: 'V8' }],
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
            expect(prisma.quiz_attempts.create).not.toHaveBeenCalled();
        });
    });
    describe('getQuizAttemptResult', () => {
        it('should return results only for the owner of the attempt', async () => {
            prisma.quiz_attempts.findFirst.mockResolvedValue(null);
            await expect(service.getQuizAttemptResult('user-1', 'attempt-2')).rejects.toBeInstanceOf(common_1.NotFoundException);
            expect(prisma.quiz_attempts.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'attempt-2',
                    user_id: 'user-1',
                },
                select: expect.any(Object),
            });
        });
    });
});
//# sourceMappingURL=training.service.spec.js.map