import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { InternalAgentGuard } from './internal-agent.guard';
import { InternalTokenService } from '../internal-token.service';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AGENT_SCOPE_KEY } from '../decorators/agent-scope.decorator';

describe('InternalAgentGuard', () => {
  let guard: InternalAgentGuard;
  let reflector: Reflector;
  let internalTokenService: InternalTokenService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockInternalTokenService = {
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalAgentGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: InternalTokenService, useValue: mockInternalTokenService },
      ],
    }).compile();

    guard = module.get<InternalAgentGuard>(InternalAgentGuard);
    reflector = module.get<Reflector>(Reflector);
    internalTokenService = module.get<InternalTokenService>(InternalTokenService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: any;
    let mockRequest: any;

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
      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      mockInternalTokenService.verifyToken.mockResolvedValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });
});
