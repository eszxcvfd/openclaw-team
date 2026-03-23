"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const http_exception_filter_1 = require("../../common/filters/http-exception.filter");
const success_response_interceptor_1 = require("../../common/interceptors/success-response.interceptor");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const auth_password_util_1 = require("../../modules/auth/auth-password.util");
const auth_controller_1 = require("../../modules/auth/auth.controller");
const auth_service_1 = require("../../modules/auth/auth.service");
describe('AuthController', () => {
    let app;
    const prismaService = {
        users: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [jwt_1.JwtModule.register({})],
            controllers: [auth_controller_1.AuthController],
            providers: [
                auth_service_1.AuthService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prismaService,
                },
            ],
        }).compile();
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
        process.env.JWT_ACCESS_SECRET = 'integration-access-secret';
        process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret';
        process.env.JWT_ACCESS_TTL_SECONDS = '3600';
        process.env.JWT_REFRESH_TTL_SECONDS = '604800';
    });
    it('wraps login success response with trace id metadata', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('OpenClaw#2026');
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-2',
            email: 'manager@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Manager Two',
            status: 'active',
            deleted_at: null,
            departments: {
                code: 'ops',
                name: 'Operations',
            },
            user_roles: [
                {
                    roles: {
                        code: 'manager',
                        name: 'Manager',
                    },
                },
            ],
        });
        prismaService.users.update.mockResolvedValue(undefined);
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/auth/login')
            .set('X-Trace-Id', 'trace-auth-001')
            .send({
            email: 'manager@openclaw.local',
            password: 'OpenClaw#2026',
        });
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            success: true,
            data: {
                user: {
                    email: 'manager@openclaw.local',
                    role: 'Manager',
                    department: 'Operations',
                },
            },
            meta: {
                traceId: 'trace-auth-001',
            },
        });
        expect(response.body.data.tokens).toMatchObject({
            userAccessToken: expect.any(String),
            refreshToken: expect.any(String),
            tokenType: 'Bearer',
            expiresIn: 3600,
        });
    });
    it('returns standardized unauthorized response on invalid password', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('Correct#Password1');
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-3',
            email: 'employee@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Employee Three',
            status: 'active',
            deleted_at: null,
            departments: null,
            user_roles: [],
        });
        const response = await (0, supertest_1.default)(app.getHttpServer()).post('/auth/login').send({
            email: 'employee@openclaw.local',
            password: 'Wrong#Password1',
        });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
        expect(response.body.meta.traceId).toBeDefined();
    });
    it('returns standardized unauthorized response for inactive users', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('Inactive#Password1');
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-4',
            email: 'inactive@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Inactive Employee',
            status: 'inactive',
            deleted_at: null,
            departments: null,
            user_roles: [],
        });
        const response = await (0, supertest_1.default)(app.getHttpServer()).post('/auth/login').send({
            email: 'inactive@openclaw.local',
            password: 'Inactive#Password1',
        });
        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Email hoac mat khau khong hop le.',
            },
        });
    });
});
//# sourceMappingURL=auth.controller.spec.js.map