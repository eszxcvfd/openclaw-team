"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const http_exception_filter_1 = require("../../common/filters/http-exception.filter");
const success_response_interceptor_1 = require("../../common/interceptors/success-response.interceptor");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const internal_agent_guard_1 = require("../../modules/auth/guards/internal-agent.guard");
const internal_token_service_1 = require("../../modules/auth/internal-token.service");
const onboarding_internal_controller_1 = require("../../modules/onboarding/onboarding.internal.controller");
const onboarding_service_1 = require("../../modules/onboarding/onboarding.service");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
const training_controller_1 = require("../../modules/training/training.controller");
const training_internal_controller_1 = require("../../modules/training/training.internal.controller");
const training_service_1 = require("../../modules/training/training.service");
const tool_call_logging_interceptor_1 = require("../../modules/tool-gateway/tool-call-logging.interceptor");
const tool_call_logger_service_1 = require("../../modules/tool-gateway/tool-call-logger.service");
const tool_call_log_metadata_resolver_1 = require("../../modules/tool-gateway/tool-call-log-metadata.resolver");
describe('Internal tool audit integration', () => {
    let app;
    const prisma = {
        agent_group_tools: {
            findFirst: jest.fn(),
        },
        backend_api_catalog: {
            findFirst: jest.fn(),
        },
        agent_groups: {
            findUnique: jest.fn(),
        },
        tool_call_logs: {
            create: jest.fn(),
        },
    };
    const onboardingService = {
        getFaqItems: jest.fn(),
        getSupportContacts: jest.fn(),
        getChecklistItems: jest.fn(),
        completeChecklistTask: jest.fn(),
    };
    const trainingService = {
        generateQuizForUser: jest.fn(),
        submitQuizAttempt: jest.fn(),
        getQuizAttemptResult: jest.fn(),
    };
    const jwtAuthGuard = {
        canActivate: (context) => {
            const request = context.switchToHttp().getRequest();
            request.user = { userId: 'user-jwt-1' };
            return true;
        },
    };
    const internalTokenService = {
        verifyToken: jest.fn(),
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [jwt_1.JwtModule.register({})],
            controllers: [onboarding_internal_controller_1.OnboardingInternalController, training_internal_controller_1.TrainingInternalController, training_controller_1.TrainingController],
            providers: [
                internal_agent_guard_1.InternalAgentGuard,
                tool_call_log_metadata_resolver_1.ToolCallLogMetadataResolver,
                tool_call_logger_service_1.ToolCallLoggerService,
                tool_call_logging_interceptor_1.ToolCallLoggingInterceptor,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prisma,
                },
                {
                    provide: onboarding_service_1.OnboardingService,
                    useValue: onboardingService,
                },
                {
                    provide: training_service_1.TrainingService,
                    useValue: trainingService,
                },
                {
                    provide: internal_token_service_1.InternalTokenService,
                    useValue: internalTokenService,
                },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue(jwtAuthGuard)
            .compile();
        app = moduleRef.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }));
        app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
        app.useGlobalInterceptors(app.get(tool_call_logging_interceptor_1.ToolCallLoggingInterceptor), new success_response_interceptor_1.SuccessResponseInterceptor());
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    beforeEach(() => {
        jest.clearAllMocks();
        prisma.backend_api_catalog.findFirst.mockResolvedValue({ id: 'api-1' });
        prisma.agent_group_tools.findFirst.mockResolvedValue({ tool_id: 'tool-1' });
        prisma.agent_groups.findUnique.mockResolvedValue({ id: 'agent-group-1' });
        prisma.tool_call_logs.create.mockResolvedValue({ id: 'log-1' });
    });
    it('wraps successful internal-tool responses and appends one audit row', async () => {
        internalTokenService.verifyToken.mockResolvedValue({
            agent: 'onboarding',
            userId: 'user-1',
            conversationId: 'conv-1',
            scope: ['read:onboarding'],
            jti: 'jti-1',
        });
        onboardingService.getFaqItems.mockResolvedValue([
            {
                id: 'faq-1',
                category: 'policy',
                audience: 'all',
                question: 'Q',
                answer: 'A',
            },
        ]);
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/internal/tools/onboarding/faq')
            .set('Authorization', 'Bearer valid-token')
            .set('X-Agent-Name', 'onboarding')
            .set('X-User-Id', 'user-1')
            .set('X-Conversation-Id', 'conv-1')
            .set('X-Trace-Id', 'trace-internal-1');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.traceId).toBe('trace-internal-1');
        expect(prisma.tool_call_logs.create).toHaveBeenCalledTimes(1);
        expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                trace_id: 'trace-internal-1',
                api_id: 'api-1',
                tool_id: 'tool-1',
                agent_group_id: 'agent-group-1',
                user_id: 'user-1',
                conversation_id: 'conv-1',
                success: true,
            }),
        });
    });
    it('returns standardized unauthorized error and appends one denied audit row', async () => {
        internalTokenService.verifyToken.mockRejectedValue(new common_2.UnauthorizedException({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired internal security token.',
            details: {},
        }));
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/internal/tools/onboarding/faq')
            .set('Authorization', 'Bearer invalid-token')
            .set('X-Agent-Name', 'onboarding')
            .set('X-User-Id', 'user-header')
            .set('X-Conversation-Id', 'conv-header')
            .set('X-Trace-Id', 'trace-internal-2');
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.meta.traceId).toBe('trace-internal-2');
        expect(prisma.tool_call_logs.create).toHaveBeenCalledTimes(1);
        expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                trace_id: 'trace-internal-2',
                user_id: null,
                conversation_id: null,
                success: false,
            }),
        });
    });
    it('returns forbidden on scope mismatch and appends one denied audit row', async () => {
        internalTokenService.verifyToken.mockResolvedValue({
            agent: 'onboarding',
            userId: 'user-1',
            conversationId: 'conv-1',
            scope: ['write:checklist'],
            jti: 'jti-2',
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/internal/tools/onboarding/faq')
            .set('Authorization', 'Bearer valid-token')
            .set('X-Agent-Name', 'onboarding')
            .set('X-User-Id', 'user-1')
            .set('X-Conversation-Id', 'conv-1')
            .set('X-Trace-Id', 'trace-internal-3');
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TOOL_ACCESS_DENIED');
        expect(prisma.tool_call_logs.create).toHaveBeenCalledTimes(1);
        expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                trace_id: 'trace-internal-3',
                user_id: 'user-1',
                conversation_id: 'conv-1',
                success: false,
                http_status: 403,
            }),
        });
    });
    it('returns forbidden on header mismatch and preserves verified token ids while keeping mismatched headers only in payload metadata', async () => {
        internalTokenService.verifyToken.mockResolvedValue({
            agent: 'onboarding',
            userId: 'user-1',
            conversationId: 'conv-1',
            scope: ['read:onboarding'],
            jti: 'jti-3',
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/internal/tools/onboarding/faq')
            .set('Authorization', 'Bearer valid-token')
            .set('X-Agent-Name', 'onboarding')
            .set('X-User-Id', 'user-2')
            .set('X-Conversation-Id', 'conv-1')
            .set('X-Trace-Id', 'trace-internal-4');
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FORBIDDEN');
        expect(prisma.tool_call_logs.create).toHaveBeenCalledTimes(1);
        expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                trace_id: 'trace-internal-4',
                user_id: 'user-1',
                conversation_id: 'conv-1',
                success: false,
                http_status: 403,
            }),
        });
    });
    it('wraps training quiz generation responses and appends one audit row for the internal quiz tool', async () => {
        internalTokenService.verifyToken.mockResolvedValue({
            agent: 'learning_training_agent',
            userId: 'user-training-1',
            conversationId: 'conv-training-1',
            scope: ['write:training'],
            jti: 'jti-training-1',
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
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/internal/tools/training/quiz/generate')
            .set('Authorization', 'Bearer valid-training-token')
            .set('X-Agent-Name', 'learning_training_agent')
            .set('X-User-Id', 'user-training-1')
            .set('X-Conversation-Id', 'conv-training-1')
            .set('X-Trace-Id', 'trace-training-1')
            .send({ difficulty: 'easy', questionCount: 1 });
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.type).toBe('quiz');
        expect(response.body.meta.traceId).toBe('trace-training-1');
        expect(trainingService.generateQuizForUser).toHaveBeenCalledWith('user-training-1', {
            difficulty: 'easy',
            questionCount: 1,
        });
        expect(prisma.tool_call_logs.create).toHaveBeenCalledTimes(1);
        expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                trace_id: 'trace-training-1',
                user_id: 'user-training-1',
                conversation_id: 'conv-training-1',
                success: true,
            }),
        });
    });
    it('wraps external quiz submission responses and appends one audit row with the authenticated user id', async () => {
        trainingService.submitQuizAttempt.mockResolvedValue({
            attemptId: 'attempt-1',
            quizId: '550e8400-e29b-41d4-a716-446655440010',
            title: 'NodeJS Basics',
            difficulty: 'easy',
            course: null,
            score: 1,
            maxScore: 1,
            scorePercent: 100,
            correctCount: 1,
            totalQuestions: 1,
            durationSeconds: 12,
            submittedAt: '2026-03-23T01:00:00.000Z',
            questionResults: [],
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/api/quiz/submit')
            .set('Authorization', 'Bearer jwt-token')
            .set('X-Trace-Id', 'trace-quiz-submit-1')
            .send({
            quizId: '550e8400-e29b-41d4-a716-446655440010',
            assistantMessageId: '550e8400-e29b-41d4-a716-446655440013',
            durationSeconds: 12,
            answers: [
                {
                    questionId: '550e8400-e29b-41d4-a716-446655440012',
                    answer: 'V8',
                },
            ],
        });
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(trainingService.submitQuizAttempt).toHaveBeenCalledWith('user-jwt-1', {
            quizId: '550e8400-e29b-41d4-a716-446655440010',
            assistantMessageId: '550e8400-e29b-41d4-a716-446655440013',
            durationSeconds: 12,
            answers: [
                {
                    questionId: '550e8400-e29b-41d4-a716-446655440012',
                    answer: 'V8',
                },
            ],
        });
        expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                trace_id: 'trace-quiz-submit-1',
                user_id: 'user-jwt-1',
                success: true,
            }),
        });
    });
    it('wraps external quiz result retrieval responses and appends one audit row with the authenticated user id', async () => {
        trainingService.getQuizAttemptResult.mockResolvedValue({
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
            durationSeconds: 12,
            submittedAt: '2026-03-23T01:00:00.000Z',
            questionResults: [],
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/api/quiz/550e8400-e29b-41d4-a716-446655440011/result')
            .set('Authorization', 'Bearer jwt-token')
            .set('X-Trace-Id', 'trace-quiz-result-1');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(trainingService.getQuizAttemptResult).toHaveBeenCalledWith('user-jwt-1', '550e8400-e29b-41d4-a716-446655440011');
        expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                trace_id: 'trace-quiz-result-1',
                user_id: 'user-jwt-1',
                success: true,
            }),
        });
    });
});
//# sourceMappingURL=internal-tool-audit.spec.js.map