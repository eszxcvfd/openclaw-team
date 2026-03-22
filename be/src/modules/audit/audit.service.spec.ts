import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    tool_call_logs: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      tool_call_logs: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('builds list filters and pagination against tool_call_logs', async () => {
    prisma.tool_call_logs.count.mockResolvedValue(1);
    prisma.tool_call_logs.findMany.mockResolvedValue([
      {
        id: 'log-1',
        trace_id: 'trace-lookup-001',
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
          },
          authContext: {
            untrustedHeaders: {
              userId: 'header-user-1',
            },
          },
        },
        response_payload: {},
        http_status: 403,
        success: false,
        error_message: 'Forbidden',
        started_at: new Date('2026-03-22T10:00:00.000Z'),
        finished_at: null,
        users: null,
        tools: null,
        agent_groups: null,
      },
    ]);

    const result = await service.listAuditLogs({
      page: 2,
      pageSize: 10,
      user: 'header-user-1',
      tool: 'onboarding',
      success: false,
      dateFrom: '2026-03-21',
      dateTo: '2026-03-22',
      trace: 'trace-lookup',
    });

    expect(prisma.tool_call_logs.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        success: false,
        trace_id: {
          contains: 'trace-lookup',
          mode: 'insensitive',
        },
      }),
    });

    expect(prisma.tool_call_logs.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          success: false,
          AND: expect.any(Array),
          started_at: {
            gte: new Date('2026-03-21'),
            lte: new Date('2026-03-22T23:59:59.999Z'),
          },
        }),
        skip: 10,
        take: 10,
      }),
    );

    expect(result.items[0]).toMatchObject({
      id: 'log-1',
      resultStatus: 'denied',
      user: {
        label: 'header-user-1',
      },
      tool: {
        label: 'GET /internal/tools/onboarding/faq',
      },
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('rejects oversized pageSize', async () => {
    await expect(service.listAuditLogs({ pageSize: 101 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('maps successful rows with joined relation labels and default pagination', async () => {
    prisma.tool_call_logs.count.mockResolvedValue(1);
    prisma.tool_call_logs.findMany.mockResolvedValue([
      {
        id: 'log-success-1',
        trace_id: 'trace-success-1',
        conversation_id: 'conv-success-1',
        message_id: 'msg-success-1',
        agent_group_id: 'agent-group-1',
        tool_id: 'tool-1',
        api_id: 'api-1',
        user_id: 'user-1',
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
        started_at: new Date('2026-03-22T14:00:00.000Z'),
        finished_at: new Date('2026-03-22T14:00:02.000Z'),
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

    const result = await service.listAuditLogs({ success: true });

    expect(prisma.tool_call_logs.count).toHaveBeenCalledWith({
      where: {
        success: true,
      },
    });
    expect(prisma.tool_call_logs.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          users: true,
          tools: true,
          agent_groups: true,
        },
        orderBy: {
          started_at: 'desc',
        },
        skip: 0,
        take: 20,
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'log-success-1',
          traceId: 'trace-success-1',
          conversationId: 'conv-success-1',
          resultStatus: 'success',
          success: true,
          httpStatus: 200,
          user: expect.objectContaining({
            id: 'user-1',
            email: 'alice@example.com',
            fullName: 'Alice Example',
            label: 'Alice Example',
          }),
          tool: expect.objectContaining({
            id: 'tool-1',
            code: 'generate_quiz',
            name: 'Generate Quiz',
            label: 'Generate Quiz',
          }),
          agentGroup: {
            id: 'agent-group-1',
            code: 'learning_training',
            name: 'Learning Training',
          },
        }),
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it('returns exact stored scope and denied-row fallback fields in detail', async () => {
    prisma.tool_call_logs.findUnique.mockResolvedValue({
      id: 'log-denied-1',
      trace_id: 'trace-denied-1',
      conversation_id: null,
      message_id: null,
      agent_group_id: null,
      tool_id: null,
      api_id: null,
      user_id: null,
      request_payload: {
        request: {
          method: 'GET',
          normalizedPath: '/internal/tools/training/me/courses',
          routePath: 'me/courses',
          params: {},
          query: {},
          requiredScopes: ['read:training'],
        },
        authContext: {
          trusted: false,
          scope: ['read:training', 'read:checklist'],
          untrustedHeaders: {
            agentName: 'learning_training_agent',
            userId: 'header-user-2',
            conversationId: 'header-conv-2',
            traceId: 'trace-denied-1',
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
      started_at: new Date('2026-03-22T11:00:00.000Z'),
      finished_at: new Date('2026-03-22T11:00:01.000Z'),
      users: null,
      tools: null,
      agent_groups: null,
      backend_api_catalog: null,
    });

    const result = await service.getAuditLogDetail('log-denied-1');

    expect(result).toMatchObject({
      id: 'log-denied-1',
      traceId: 'trace-denied-1',
      resultStatus: 'denied',
      tokenScope: ['read:training', 'read:checklist'],
      user: {
        id: null,
        label: 'header-user-2',
      },
      tool: {
        id: null,
        label: 'GET /internal/tools/training/me/courses',
      },
      context: {
        authContext: {
          trusted: false,
          untrustedHeaders: {
            conversationId: 'header-conv-2',
          },
        },
      },
    });
  });

  it('throws not found for unknown detail id', async () => {
    prisma.tool_call_logs.findUnique.mockResolvedValue(null);

    await expect(service.getAuditLogDetail('unknown-log')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns successful detail rows with exact stored scope and related metadata', async () => {
    prisma.tool_call_logs.findUnique.mockResolvedValue({
      id: 'log-success-detail-1',
      trace_id: 'trace-success-detail-1',
      conversation_id: 'conv-success-detail-1',
      message_id: 'msg-success-detail-1',
      agent_group_id: 'agent-group-1',
      tool_id: 'tool-1',
      api_id: 'api-1',
      user_id: 'user-1',
      request_payload: {
        request: {
          method: 'POST',
          normalizedPath: '/internal/tools/training/quiz/generate',
          routePath: '/internal/tools/training/quiz/generate',
          params: {
            quizId: 'quiz-1',
          },
          query: {
            format: 'full',
          },
          requiredScopes: ['write:training'],
        },
        authContext: {
          trusted: true,
          agent: 'learning_training_agent',
          scope: ['write:training', 'read:training'],
        },
      },
      response_payload: {
        success: true,
        reportId: 'rep-1',
      },
      http_status: 200,
      success: true,
      error_message: null,
      started_at: new Date('2026-03-22T15:00:00.000Z'),
      finished_at: new Date('2026-03-22T15:00:02.000Z'),
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
      backend_api_catalog: {
        code: 'generate_quiz',
        http_method: 'POST',
        path: '/internal/tools/training/quiz/generate',
      },
    });

    const result = await service.getAuditLogDetail('log-success-detail-1');

    expect(result).toMatchObject({
      id: 'log-success-detail-1',
      traceId: 'trace-success-detail-1',
      conversationId: 'conv-success-detail-1',
      resultStatus: 'success',
      tokenScope: ['write:training', 'read:training'],
      user: {
        id: 'user-1',
        label: 'Alice Example',
      },
      tool: {
        id: 'tool-1',
        label: 'Generate Quiz',
      },
      agentGroup: {
        id: 'agent-group-1',
        code: 'learning_training',
      },
      api: {
        id: 'api-1',
        code: 'generate_quiz',
        method: 'POST',
        path: '/internal/tools/training/quiz/generate',
      },
      context: {
        request: {
          requiredScopes: ['write:training'],
          params: {
            quizId: 'quiz-1',
          },
          query: {
            format: 'full',
          },
        },
        authContext: {
          trusted: true,
          agent: 'learning_training_agent',
          untrustedHeaders: null,
        },
      },
    });
  });
});
