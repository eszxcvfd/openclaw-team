import { ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from '../../common/interceptors/success-response.interceptor';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InternalAgentGuard } from '../../modules/auth/guards/internal-agent.guard';
import { InternalTokenService } from '../../modules/auth/internal-token.service';
import { AnalyticsInternalController } from '../../modules/analytics/analytics.internal.controller';
import { AnalyticsService } from '../../modules/analytics/analytics.service';
import { ToolCallLoggingInterceptor } from '../../modules/tool-gateway/tool-call-logging.interceptor';
import { ToolCallLoggerService } from '../../modules/tool-gateway/tool-call-logger.service';
import { ToolCallLogMetadataResolver } from '../../modules/tool-gateway/tool-call-log-metadata.resolver';

describe('AnalyticsInternalController integration', () => {
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

  const analyticsService = {
    getDepartmentSummaryForManager: jest.fn(),
  };

  const internalTokenService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [AnalyticsInternalController],
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
          provide: AnalyticsService,
          useValue: analyticsService,
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
    prisma.backend_api_catalog.findFirst.mockResolvedValue({ id: 'api-analytics-1' });
    prisma.agent_group_tools.findFirst.mockResolvedValue({ tool_id: 'tool-analytics-1' });
    prisma.agent_groups.findUnique.mockResolvedValue({ id: 'agent-group-analytics-1' });
    prisma.tool_call_logs.create.mockResolvedValue({ id: 'log-analytics-1' });
  });

  it('returns wrapped success payload for manager department summary', async () => {
    internalTokenService.verifyToken.mockResolvedValue({
      agent: 'training_analytics_agent',
      userId: 'manager-1',
      conversationId: 'conv-analytics-1',
      scope: ['read:analytics'],
      jti: 'jti-analytics-1',
    });
    analyticsService.getDepartmentSummaryForManager.mockResolvedValue({
      departmentId: 'dep-1',
      departmentName: 'Engineering',
      periodLabel: '03/2026',
      completionRate: 84,
      sentimentBreakdown: {
        positive: 7,
        neutral: 2,
        negative: 1,
      },
      sentimentLabel: 'positive',
      generatedAt: '2026-03-23T02:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get('/internal/tools/analytics/training/department')
      .set('Authorization', 'Bearer valid-token')
      .set('X-Agent-Name', 'training_analytics_agent')
      .set('X-User-Id', 'manager-1')
      .set('X-Conversation-Id', 'conv-analytics-1')
      .set('X-Trace-Id', 'trace-analytics-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta.traceId).toBe('trace-analytics-1');
    expect(response.body.data).toEqual(
      expect.objectContaining({
        departmentName: 'Engineering',
        completionRate: 84,
      }),
    );
    expect(prisma.tool_call_logs.create).toHaveBeenCalledTimes(1);
  });

  it('returns wrapped forbidden response when manager scope is denied', async () => {
    internalTokenService.verifyToken.mockResolvedValue({
      agent: 'training_analytics_agent',
      userId: 'user-1',
      conversationId: 'conv-analytics-2',
      scope: ['read:analytics'],
      jti: 'jti-analytics-2',
    });
    analyticsService.getDepartmentSummaryForManager.mockRejectedValue(
      new ForbiddenException({
        code: 'AGENT_ACCESS_DENIED',
        message: 'User does not have permission to access department analytics summary.',
        details: {},
      }),
    );

    const response = await request(app.getHttpServer())
      .get('/internal/tools/analytics/training/department')
      .set('Authorization', 'Bearer valid-token')
      .set('X-Agent-Name', 'training_analytics_agent')
      .set('X-User-Id', 'user-1')
      .set('X-Conversation-Id', 'conv-analytics-2')
      .set('X-Trace-Id', 'trace-analytics-2');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
    expect(response.body.meta.traceId).toBe('trace-analytics-2');
    expect(prisma.tool_call_logs.create).toHaveBeenCalledTimes(1);
    expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        trace_id: 'trace-analytics-2',
        user_id: 'user-1',
        conversation_id: 'conv-analytics-2',
        success: false,
        http_status: 403,
      }),
    });
  });

  it('returns wrapped internal error response on graceful failure path', async () => {
    internalTokenService.verifyToken.mockResolvedValue({
      agent: 'training_analytics_agent',
      userId: 'manager-2',
      conversationId: 'conv-analytics-3',
      scope: ['read:analytics'],
      jti: 'jti-analytics-3',
    });
    analyticsService.getDepartmentSummaryForManager.mockRejectedValue(
      new Error('unexpected failure'),
    );

    const response = await request(app.getHttpServer())
      .get('/internal/tools/analytics/training/department')
      .set('Authorization', 'Bearer valid-token')
      .set('X-Agent-Name', 'training_analytics_agent')
      .set('X-User-Id', 'manager-2')
      .set('X-Conversation-Id', 'conv-analytics-3')
      .set('X-Trace-Id', 'trace-analytics-3');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.meta.traceId).toBe('trace-analytics-3');
    expect(prisma.tool_call_logs.create).toHaveBeenCalledTimes(1);
    expect(prisma.tool_call_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        trace_id: 'trace-analytics-3',
        user_id: 'manager-2',
        conversation_id: 'conv-analytics-3',
        success: false,
        http_status: 500,
      }),
    });
  });
});
