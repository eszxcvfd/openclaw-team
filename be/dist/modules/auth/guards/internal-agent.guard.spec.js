"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const core_1 = require("@nestjs/core");
const internal_agent_guard_1 = require("./internal-agent.guard");
const internal_token_service_1 = require("../internal-token.service");
const common_1 = require("@nestjs/common");
describe('InternalAgentGuard', () => {
    let guard;
    let reflector;
    let internalTokenService;
    const mockReflector = {
        getAllAndOverride: jest.fn(),
    };
    const mockInternalTokenService = {
        verifyToken: jest.fn(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                internal_agent_guard_1.InternalAgentGuard,
                { provide: core_1.Reflector, useValue: mockReflector },
                { provide: internal_token_service_1.InternalTokenService, useValue: mockInternalTokenService },
            ],
        }).compile();
        guard = module.get(internal_agent_guard_1.InternalAgentGuard);
        reflector = module.get(core_1.Reflector);
        internalTokenService = module.get(internal_token_service_1.InternalTokenService);
    });
    it('should be defined', () => {
        expect(guard).toBeDefined();
    });
    describe('canActivate', () => {
        let mockContext;
        let mockRequest;
        beforeEach(() => {
            mockRequest = {
                headers: {},
                params: {},
                query: {},
                body: {},
            };
            mockContext = {
                switchToHttp: () => ({
                    getRequest: () => mockRequest,
                }),
                getHandler: jest.fn(),
                getClass: jest.fn(),
            };
        });
        it('should throw UnauthorizedException if Authorization header is missing', async () => {
            await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException if token is invalid', async () => {
            mockRequest.headers.authorization = 'Bearer invalid-token';
            mockInternalTokenService.verifyToken.mockResolvedValue(null);
            await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should allow access if no scopes are required', async () => {
            mockRequest.headers.authorization = 'Bearer valid-token';
            const mockPayload = {
                agent: 'onboarding_assistant',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: [],
            };
            mockInternalTokenService.verifyToken.mockResolvedValue(mockPayload);
            mockReflector.getAllAndOverride.mockReturnValue(null);
            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
            expect(mockRequest.internalAgent).toEqual(mockPayload);
        });
        it('should allow access if user has required scopes', async () => {
            mockRequest.headers.authorization = 'Bearer valid-token';
            const mockPayload = {
                agent: 'onboarding_assistant',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: ['read:onboarding'],
            };
            mockInternalTokenService.verifyToken.mockResolvedValue(mockPayload);
            mockReflector.getAllAndOverride.mockReturnValue(['read:onboarding']);
            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
        });
        it('should throw ForbiddenException if user lacks required scopes', async () => {
            mockRequest.headers.authorization = 'Bearer valid-token';
            const mockPayload = {
                agent: 'onboarding_assistant',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: ['other'],
            };
            mockInternalTokenService.verifyToken.mockResolvedValue(mockPayload);
            mockReflector.getAllAndOverride.mockReturnValue(['read:onboarding']);
            await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.ForbiddenException);
        });
        it('should throw ForbiddenException if x-user-id does not match token userId', async () => {
            mockRequest.headers.authorization = 'Bearer valid-token';
            mockRequest.headers['x-user-id'] = 'user-2';
            mockInternalTokenService.verifyToken.mockResolvedValue({
                agent: 'onboarding_assistant',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: [],
            });
            mockReflector.getAllAndOverride.mockReturnValue(null);
            await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.ForbiddenException);
        });
        it('should throw ForbiddenException if route params request another userId', async () => {
            mockRequest.headers.authorization = 'Bearer valid-token';
            mockRequest.params.userId = 'user-2';
            mockInternalTokenService.verifyToken.mockResolvedValue({
                agent: 'onboarding_assistant',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: [],
            });
            mockReflector.getAllAndOverride.mockReturnValue(null);
            await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.ForbiddenException);
        });
        it('should throw ForbiddenException if x-agent-name does not match token agent', async () => {
            mockRequest.headers.authorization = 'Bearer valid-token';
            mockRequest.headers['x-agent-name'] = 'training_analytics_agent';
            mockInternalTokenService.verifyToken.mockResolvedValue({
                agent: 'onboarding_assistant',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: [],
            });
            mockReflector.getAllAndOverride.mockReturnValue(null);
            await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.ForbiddenException);
        });
    });
});
//# sourceMappingURL=internal-agent.guard.spec.js.map