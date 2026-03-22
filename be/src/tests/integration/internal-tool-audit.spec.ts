import { INestApplication, ValidationPipe } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from '../../common/interceptors/success-response.interceptor';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InternalAgentGuard } from '../../modules/auth/guards/internal-agent.guard';
import { InternalTokenService } from '../../modules/auth/internal-token.service';
import { OnboardingInternalController } from '../../modules/onboarding/onboarding.internal.controller';
import { OnboardingService } from '../../modules/onboarding/onboarding.service';
import { ToolCallLoggingInterceptor } from '../../modules/tool-gateway/tool-call-logging.interceptor';
import { ToolCallLoggerService } from '../../modules/tool-gateway/tool-call-logger.service';
import { ToolCallLogMetadataResolver } from '../../modules/tool-gateway/tool-call-log-metadata.resolver';

describe('Internal tool audit integration', () => {
  let app: INestApplication;

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

  const internalTokenService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [OnboardingInternalController],
      providers: [
        InternalAgentGuard,
        ToolCallLogMetadataResolver,
        ToolCallLoggerService,
        ToolCallLoggingInterceptor,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: OnboardingService,
          useValue: onboardingService,
        },
        {
          provide: InternalTokenService,
          useValue: internalTokenService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(
      app.get(ToolCallLoggingInterceptor),
      new SuccessResponseInterceptor(),
    );
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

    const response = await request(app.getHttpServer())
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
    internalTokenService.verifyToken.mockRejectedValue(
      new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired internal security token.',
        details: {},
      }),
    );

    const response = await request(app.getHttpServer())
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

    const response = await request(app.getHttpServer())
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

    const response = await request(app.getHttpServer())
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
});
