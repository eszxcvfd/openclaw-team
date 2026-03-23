"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const http_exception_filter_1 = require("../../common/filters/http-exception.filter");
const success_response_interceptor_1 = require("../../common/interceptors/success-response.interceptor");
const admin_guard_1 = require("../../core/guards/admin.guard");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_controller_1 = require("../../modules/audit/audit.controller");
const audit_service_1 = require("../../modules/audit/audit.service");
describe('AuditController integration', () => {
    let app;
    const prisma = {
        tool_call_logs: {
            count: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [audit_controller_1.AuditController],
            providers: [
                audit_service_1.AuditService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prisma,
                },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(admin_guard_1.AdminGuard)
            .useValue({ canActivate: () => true })
            .compile();
        app = moduleRef.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }));
        app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
        app.useGlobalInterceptors(new success_response_interceptor_1.SuccessResponseInterceptor());
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('returns wrapped list response with trace metadata', async () => {
        prisma.tool_call_logs.count.mockResolvedValue(1);
        prisma.tool_call_logs.findMany.mockResolvedValue([
            {
                id: 'log-1',
                trace_id: 'trace-list-1',
                conversation_id: 'conv-1',
                message_id: null,
                agent_group_id: null,
                tool_id: null,
                api_id: null,
                user_id: null,
                request_payload: {
                    authContext: {
                        untrustedHeaders: {
                            userId: 'user-fallback-1',
                        },
                    },
                },
                response_payload: {},
                http_status: 403,
                success: false,
                error_message: 'Denied',
                started_at: new Date('2026-03-22T12:00:00.000Z'),
                finished_at: null,
                users: null,
                tools: null,
                agent_groups: null,
            },
        ]);
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/api/audit-logs?page=1&pageSize=20&success=false&trace=trace-list')
            .set('X-Trace-Id', 'trace-external-list-1');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.traceId).toBe('trace-external-list-1');
        expect(response.body.data.pagination).toMatchObject({
            page: 1,
            pageSize: 20,
            totalItems: 1,
            totalPages: 1,
        });
        expect(response.body.data.items[0]).toMatchObject({
            id: 'log-1',
            traceId: 'trace-list-1',
            resultStatus: 'denied',
            user: {
                label: 'user-fallback-1',
            },
        });
    });
    it('returns wrapped detail response exposing exact stored scope', async () => {
        prisma.tool_call_logs.findUnique.mockResolvedValue({
            id: 'log-2',
            trace_id: 'trace-detail-2',
            conversation_id: null,
            message_id: null,
            agent_group_id: null,
            tool_id: null,
            api_id: null,
            user_id: null,
            request_payload: {
                request: {
                    method: 'GET',
                    normalizedPath: '/internal/tools/onboarding/faq',
                    requiredScopes: ['read:onboarding'],
                },
                authContext: {
                    trusted: false,
                    scope: ['scope:a', 'scope:b'],
                    untrustedHeaders: {
                        userId: 'user-unverified-2',
                    },
                },
            },
            response_payload: {
                error: {
                    code: 'FORBIDDEN',
                    message: 'Denied',
                    details: {},
                },
            },
            http_status: 403,
            success: false,
            error_message: 'Denied',
            started_at: new Date('2026-03-22T12:10:00.000Z'),
            finished_at: null,
            users: null,
            tools: null,
            agent_groups: null,
            backend_api_catalog: null,
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/api/audit-logs/log-2')
            .set('X-Trace-Id', 'trace-external-detail-2');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.traceId).toBe('trace-external-detail-2');
        expect(response.body.data).toMatchObject({
            id: 'log-2',
            tokenScope: ['scope:a', 'scope:b'],
            context: {
                request: {
                    requiredScopes: ['read:onboarding'],
                },
            },
            user: {
                label: 'user-unverified-2',
            },
        });
    });
    it('coerces list query params and returns successful rows with pagination metadata', async () => {
        prisma.tool_call_logs.count.mockResolvedValue(25);
        prisma.tool_call_logs.findMany.mockResolvedValue([
            {
                id: 'log-3',
                trace_id: 'trace-success-3',
                conversation_id: 'conv-3',
                message_id: 'msg-3',
                agent_group_id: 'agent-group-3',
                tool_id: 'tool-3',
                api_id: null,
                user_id: 'user-3',
                request_payload: {
                    request: {
                        method: 'POST',
                        normalizedPath: '/internal/tools/training/quiz/generate',
                    },
                },
                response_payload: {
                    success: true,
                },
                http_status: 200,
                success: true,
                error_message: null,
                started_at: new Date('2026-03-22T13:00:00.000Z'),
                finished_at: new Date('2026-03-22T13:00:01.000Z'),
                users: {
                    email: 'alice@example.com',
                    full_name: 'Alice Example',
                },
                tools: {
                    code: 'generate_quiz',
                    name: 'Generate Quiz',
                },
                agent_groups: {
                    code: 'learning_training',
                    name: 'Learning Training',
                },
            },
        ]);
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/api/audit-logs?page=2&pageSize=10&user=alice&tool=generate&success=true&dateFrom=2026-03-21&dateTo=2026-03-22&trace=trace-success')
            .set('X-Trace-Id', 'trace-external-list-3');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.traceId).toBe('trace-external-list-3');
        expect(response.body.data.pagination).toEqual({
            page: 2,
            pageSize: 10,
            totalItems: 25,
            totalPages: 3,
        });
        expect(response.body.data.items[0]).toMatchObject({
            id: 'log-3',
            resultStatus: 'success',
            user: {
                label: 'Alice Example',
            },
            tool: {
                label: 'Generate Quiz',
            },
            agentGroup: {
                code: 'learning_training',
            },
        });
        expect(prisma.tool_call_logs.findMany).toHaveBeenCalledWith(expect.objectContaining({
            skip: 10,
            take: 10,
            where: expect.objectContaining({
                success: true,
                trace_id: {
                    contains: 'trace-success',
                    mode: 'insensitive',
                },
            }),
        }));
    });
    it('rejects invalid query params through validation pipe', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/api/audit-logs?page=0&pageSize=101&success=maybe')
            .set('X-Trace-Id', 'trace-invalid-query-4');
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.meta.traceId).toBe('trace-invalid-query-4');
    });
    it('returns standardized forbidden error for non-admin access', async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [audit_controller_1.AuditController],
            providers: [
                audit_service_1.AuditService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prisma,
                },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(admin_guard_1.AdminGuard)
            .useValue({ canActivate: () => false })
            .compile();
        const deniedApp = moduleRef.createNestApplication();
        deniedApp.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }));
        deniedApp.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
        deniedApp.useGlobalInterceptors(new success_response_interceptor_1.SuccessResponseInterceptor());
        await deniedApp.init();
        const response = await (0, supertest_1.default)(deniedApp.getHttpServer())
            .get('/api/audit-logs')
            .set('X-Trace-Id', 'trace-external-denied-3');
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FORBIDDEN');
        expect(response.body.meta.traceId).toBe('trace-external-denied-3');
        await deniedApp.close();
    });
});
//# sourceMappingURL=audit.controller.spec.js.map