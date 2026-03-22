import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { ToolCallLogMetadataResolver } from './tool-call-log-metadata.resolver';
import { ToolCallLoggerService } from './tool-call-logger.service';

describe('ToolCallLoggerService', () => {
  let service: ToolCallLoggerService;

  const prisma = {
    tool_call_logs: {
      create: jest.fn(),
    },
  };

  const metadataResolver = {
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolCallLoggerService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ToolCallLogMetadataResolver,
          useValue: metadataResolver,
        },
      ],
    }).compile();

    service = module.get(ToolCallLoggerService);
  });

  it('persists denied requests with untrusted headers and null verified ids when payload is not trusted', async () => {
    metadataResolver.resolve.mockResolvedValue({
      normalizedPath: '/internal/tools/onboarding/faq',
      routePath: 'faq',
      method: 'GET',
      apiId: 'api-1',
      toolId: 'tool-1',
      agentGroupId: null,
    });

    await service.logGuardDenial({
      request: {
        method: 'GET',
        headers: {
          'x-agent-name': 'onboarding_assistant',
          'x-user-id': 'user-header',
          'x-conversation-id': 'conv-header',
          'x-trace-id': 'trace-guard-1',
        },
        baseUrl: '/internal/tools/onboarding',
        route: { path: 'faq' },
        originalUrl: '/internal/tools/onboarding/faq',
        params: {},
        query: {},
        body: {},
      } as never,
      error: new ForbiddenException({
        code: 'TOOL_ACCESS_DENIED',
        message: 'Agent lacks required scope for this tool.',
        details: {},
      }),
      requiredScopes: ['read:onboarding'],
      startedAt: new Date('2026-03-22T14:00:00.000Z'),
    });

    expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        trace_id: 'trace-guard-1',
        user_id: null,
        conversation_id: null,
        agent_group_id: null,
        api_id: 'api-1',
        tool_id: 'tool-1',
        success: false,
        http_status: 403,
      }),
    });
  });

  it('persists successful executions with verified identities and response payload', async () => {
    metadataResolver.resolve.mockResolvedValue({
      normalizedPath: '/internal/tools/onboarding/faq',
      routePath: 'faq',
      method: 'GET',
      apiId: 'api-1',
      toolId: 'tool-1',
      agentGroupId: 'agent-group-1',
    });

    await service.logExecutionResult({
      request: {
        method: 'GET',
        headers: {
          'x-trace-id': 'trace-success-1',
        },
        baseUrl: '/internal/tools/onboarding',
        route: { path: 'faq' },
        originalUrl: '/internal/tools/onboarding/faq',
        params: {},
        query: {},
        body: {},
        res: {
          statusCode: 200,
          setHeader: jest.fn(),
        },
      } as never,
      responsePayload: {
        success: true,
      },
      startedAt: new Date('2026-03-22T14:00:00.000Z'),
      verifiedPayload: {
        agent: 'onboarding',
        userId: 'user-1',
        conversationId: 'conv-1',
        scope: ['read:onboarding'],
        jti: 'jti-1',
      },
    });

    expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        trace_id: 'trace-success-1',
        user_id: 'user-1',
        conversation_id: 'conv-1',
        agent_group_id: 'agent-group-1',
        api_id: 'api-1',
        tool_id: 'tool-1',
        success: true,
        http_status: 200,
      }),
    });
  });

  it('swallows metadata resolution failures so audit cannot change request behavior', async () => {
    metadataResolver.resolve.mockRejectedValue(new Error('catalog lookup failed'));

    await expect(
      service.logExecutionResult({
        request: {
          method: 'GET',
          headers: {
            'x-trace-id': 'trace-safe-1',
          },
          originalUrl: '/internal/tools/onboarding/faq',
          res: {
            statusCode: 200,
            setHeader: jest.fn(),
          },
        } as never,
        responsePayload: { ok: true },
        startedAt: new Date('2026-03-22T14:00:00.000Z'),
        verifiedPayload: {
          agent: 'onboarding',
          userId: 'user-1',
          conversationId: 'conv-1',
          scope: ['read:onboarding'],
          jti: 'jti-1',
        },
      }),
    ).resolves.toBeUndefined();

    expect(prisma.tool_call_logs.create).not.toHaveBeenCalled();
  });
});
