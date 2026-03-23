import { Test, TestingModule } from '@nestjs/testing';
import { AgentRouterService } from '../agent-router/agent-router.service';
import { InternalTokenService } from '../auth/internal-token.service';
import { ContextBuilderService } from '../context-builder/context-builder.service';
import { OpenclawService } from '../openclaw/openclaw.service';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';

describe('ChatService', () => {
  let service: ChatService;
  let conversationService: {
    findConversationBySession: jest.Mock;
    getOrCreateConversation: jest.Mock;
    saveMessage: jest.Mock;
  };
  let agentRouterService: {
    routeMessage: jest.Mock;
  };
  let contextBuilderService: {
    build: jest.Mock;
  };
  let internalTokenService: {
    createToken: jest.Mock;
  };
  let openclawService: {
    run: jest.Mock;
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    conversationService = {
      findConversationBySession: jest.fn(),
      getOrCreateConversation: jest.fn(),
      saveMessage: jest.fn(),
    };

    agentRouterService = {
      routeMessage: jest.fn(),
    };

    contextBuilderService = {
      build: jest.fn(),
    };

    internalTokenService = {
      createToken: jest.fn(),
    };

    openclawService = {
      run: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ConversationService,
          useValue: conversationService,
        },
        {
          provide: ContextBuilderService,
          useValue: contextBuilderService,
        },
        {
          provide: AgentRouterService,
          useValue: agentRouterService,
        },
        {
          provide: InternalTokenService,
          useValue: internalTokenService,
        },
        {
          provide: OpenclawService,
          useValue: openclawService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should build prompt context before completing the mock response', async () => {
    agentRouterService.routeMessage.mockResolvedValue({
      agentGroup: 'learning_training_agent',
      allowedResources: {
        documents: [],
        tools: ['get_training_recommendations'],
        scopes: ['read:training'],
      },
      allowedAgentGroups: ['learning_training_agent'],
      classificationSource: 'rule',
    });
    conversationService.getOrCreateConversation.mockResolvedValue({
      id: 'conv-1',
    });
    conversationService.findConversationBySession.mockResolvedValue(null);
    conversationService.saveMessage.mockResolvedValue(undefined);
    contextBuilderService.build.mockResolvedValue({
      user: { id: 'user-1' },
      session: { conversationId: 'conv-1' },
      allowedResources: {
        documents: [],
        tools: ['get_training_recommendations'],
        scopes: ['read:training'],
      },
    });
    internalTokenService.createToken.mockResolvedValue('internal-token-0');
    openclawService.run.mockResolvedValue({
      text: 'Xin chao, toi da tiep nhan yeu cau cua ban.',
      uiPayload: null,
    });

    const stream = await service.processMessage(
      'user-1',
      'Xin chao',
      'session-1',
    );

    const completion = new Promise<void>((resolve, reject) => {
      stream.subscribe({
        complete: resolve,
        error: reject,
      });
    });

    await jest.runAllTimersAsync();
    await completion;

    expect(contextBuilderService.build).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      {
        agentGroup: 'learning_training_agent',
        allowedResources: {
          documents: [],
          tools: ['get_training_recommendations'],
          scopes: ['read:training'],
        },
      },
    );
    expect(agentRouterService.routeMessage).toHaveBeenCalledWith({
      userId: 'user-1',
      message: 'Xin chao',
      currentAgentGroup: null,
    });
    expect(conversationService.saveMessage).toHaveBeenNthCalledWith(
      1,
      'conv-1',
      'user',
      'Xin chao',
      'user-1',
    );
    expect(conversationService.saveMessage).toHaveBeenLastCalledWith(
      'conv-1',
      'assistant',
      expect.any(String),
      undefined,
      expect.objectContaining({
        orchestration: 'openclaw',
        agentName: 'learning_training_agent',
        uiPayloadVersion: null,
        uiPayload: null,
      }),
    );
  });

  it('should route analytics requests through OpenClaw with scoped token', async () => {
    agentRouterService.routeMessage.mockResolvedValue({
      agentGroup: 'training_analytics_agent',
      allowedResources: {
        documents: [],
        tools: ['get_department_training_analytics'],
        scopes: ['read:analytics'],
      },
      allowedAgentGroups: ['training_analytics_agent'],
      classificationSource: 'rule',
    });
    conversationService.getOrCreateConversation.mockResolvedValue({
      id: 'conv-analytics',
    });
    conversationService.findConversationBySession.mockResolvedValue({
      id: 'conv-analytics',
      agent_groups: {
        code: 'training_analytics_agent',
      },
    });
    conversationService.saveMessage.mockResolvedValue(undefined);
    contextBuilderService.build.mockResolvedValue({
      user: { id: 'manager-1' },
      session: { conversationId: 'conv-analytics' },
      allowedResources: {
        documents: [],
        tools: ['get_department_training_analytics'],
        scopes: ['read:analytics'],
      },
    });
    internalTokenService.createToken.mockResolvedValue('internal-token-1');
    openclawService.run.mockResolvedValue({
      text: 'Bao cao phong ban da san sang.',
      uiPayload: {
        type: 'analytics-summary',
        title: 'Department Summary',
        departmentName: 'Engineering',
        periodLabel: '03/2026',
        completionRate: 84,
        sentimentBreakdown: {
          positive: 7,
          neutral: 2,
          negative: 1,
        },
        sentimentLabel: 'positive',
      },
    });

    const stream = await service.processMessage(
      'manager-1',
      'Cho toi bao cao analytics dao tao phong ban',
      'session-analytics',
    );
    const events: any[] = [];
    const completion = new Promise<void>((resolve, reject) => {
      stream.subscribe({
        next: (event) => events.push(event),
        complete: resolve,
        error: reject,
      });
    });

    await jest.runAllTimersAsync();
    await completion;

    expect(internalTokenService.createToken).toHaveBeenCalledWith(
      'training_analytics_agent',
      'manager-1',
      'conv-analytics',
      ['read:analytics'],
    );
    expect(openclawService.run).toHaveBeenCalledWith(
      expect.objectContaining({
        agentName: 'training_analytics_agent',
        message: 'Cho toi bao cao analytics dao tao phong ban',
        internalToken: 'internal-token-1',
        conversationId: 'conv-analytics',
        userId: 'manager-1',
        traceId: expect.any(String),
        context: expect.objectContaining({
          allowedResources: {
            documents: [],
            tools: ['get_department_training_analytics'],
            scopes: ['read:analytics'],
          },
        }),
      }),
    );
    expect(events.some((event) => event?.data?.uiPayload?.type === 'analytics-summary')).toBe(true);
    expect(conversationService.saveMessage).toHaveBeenLastCalledWith(
      'conv-analytics',
      'assistant',
      'Bao cao phong ban da san sang.',
      undefined,
      expect.objectContaining({
        orchestration: 'openclaw',
        agentName: 'training_analytics_agent',
        traceId: expect.any(String),
        uiPayload: expect.objectContaining({
          type: 'analytics-summary',
        }),
      }),
    );
  });

  it('should degrade to safe fallback text when OpenClaw orchestration fails', async () => {
    agentRouterService.routeMessage.mockResolvedValue({
      agentGroup: 'training_analytics_agent',
      allowedResources: {
        documents: [],
        tools: ['get_department_training_analytics'],
        scopes: ['read:analytics'],
      },
      allowedAgentGroups: ['training_analytics_agent'],
      classificationSource: 'rule',
    });
    conversationService.getOrCreateConversation.mockResolvedValue({
      id: 'conv-analytics-fallback',
    });
    conversationService.findConversationBySession.mockResolvedValue(null);
    conversationService.saveMessage.mockResolvedValue(undefined);
    contextBuilderService.build.mockResolvedValue({
      user: { id: 'manager-1' },
      session: { conversationId: 'conv-analytics-fallback' },
      allowedResources: {
        documents: [],
        tools: ['get_department_training_analytics'],
        scopes: ['read:analytics'],
      },
    });
    internalTokenService.createToken.mockResolvedValue('internal-token-2');
    openclawService.run.mockRejectedValue(new Error('OpenClaw unavailable'));

    const stream = await service.processMessage(
      'manager-1',
      'Cho toi bao cao analytics dao tao phong ban',
      'session-analytics-fallback',
    );
    const events: any[] = [];
    const completion = new Promise<void>((resolve, reject) => {
      stream.subscribe({
        next: (event) => events.push(event),
        complete: resolve,
        error: reject,
      });
    });

    await jest.runAllTimersAsync();
    await completion;

    expect(events.some((event) => event?.data?.uiPayload)).toBe(false);
    expect(conversationService.saveMessage).toHaveBeenLastCalledWith(
      'conv-analytics-fallback',
      'assistant',
      'Khong the xu ly yeu cau qua OpenClaw luc nay. Vui long thu lai sau.',
      undefined,
      expect.objectContaining({
        orchestration: 'openclaw-fallback',
        agentName: 'training_analytics_agent',
        traceId: expect.any(String),
        uiPayload: null,
      }),
    );
  });
});
