import { Test, TestingModule } from '@nestjs/testing';
import { InternalTokenService } from '../auth/internal-token.service';
import { ContextBuilderService } from '../context-builder/context-builder.service';
import { OpenclawService } from '../openclaw/openclaw.service';
import { TrainingService } from '../training/training.service';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';

describe('ChatService', () => {
  let service: ChatService;
  let conversationService: {
    getOrCreateConversation: jest.Mock;
    saveMessage: jest.Mock;
  };
  let contextBuilderService: {
    build: jest.Mock;
  };
  let trainingService: {
    generateQuizForUser: jest.Mock;
    generateLearningPathForUser: jest.Mock;
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
      getOrCreateConversation: jest.fn(),
      saveMessage: jest.fn(),
    };

    contextBuilderService = {
      build: jest.fn(),
    };

    trainingService = {
      generateQuizForUser: jest.fn(),
      generateLearningPathForUser: jest.fn(),
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
          provide: TrainingService,
          useValue: trainingService,
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
    conversationService.getOrCreateConversation.mockResolvedValue({
      id: 'conv-1',
    });
    conversationService.saveMessage.mockResolvedValue(undefined);
    contextBuilderService.build.mockResolvedValue({
      user: { id: 'user-1' },
      session: { conversationId: 'conv-1' },
      allowedResources: { documents: [], tools: [], scopes: [] },
    });
    trainingService.generateQuizForUser.mockResolvedValue(null);
    trainingService.generateLearningPathForUser.mockResolvedValue(null);

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

    expect(contextBuilderService.build).toHaveBeenCalledWith('user-1', 'conv-1');
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
        {
          orchestration: 'mock',
          uiPayloadVersion: null,
          uiPayload: null,
        },
      );
    });

  it('should emit and persist versioned quiz uiPayload metadata for quiz-like requests', async () => {
    conversationService.getOrCreateConversation.mockResolvedValue({
      id: 'conv-quiz',
    });
    conversationService.saveMessage.mockResolvedValue(undefined);
    contextBuilderService.build.mockResolvedValue({
      user: { id: 'user-1' },
      session: { conversationId: 'conv-quiz' },
      allowedResources: { documents: [], tools: [], scopes: [] },
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

    const stream = await service.processMessage(
      'user-1',
      'Tao mini quiz NodeJS cho toi',
      'session-quiz',
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

    expect(trainingService.generateQuizForUser).toHaveBeenCalledWith('user-1', {
      queryText: 'Tao mini quiz NodeJS cho toi',
    });
    expect(
      events.some((event) => event?.data?.uiPayload?.type === 'quiz'),
    ).toBe(true);
    expect(conversationService.saveMessage).toHaveBeenLastCalledWith(
      'conv-quiz',
      'assistant',
      expect.stringContaining('mini quiz'),
      undefined,
      expect.objectContaining({
        orchestration: 'mock',
        uiPayloadVersion: 1,
        uiPayload: expect.objectContaining({
          type: 'quiz',
          quizId: 'quiz-1',
        }),
      }),
    );
  });

  it('should emit and persist versioned learning-path uiPayload metadata for recommendation requests', async () => {
    conversationService.getOrCreateConversation.mockResolvedValue({
      id: 'conv-path',
    });
    conversationService.saveMessage.mockResolvedValue(undefined);
    contextBuilderService.build.mockResolvedValue({
      user: { id: 'user-1' },
      session: { conversationId: 'conv-path' },
      allowedResources: { documents: [], tools: [], scopes: [] },
    });
    trainingService.generateQuizForUser.mockResolvedValue(null);
    trainingService.generateLearningPathForUser.mockResolvedValue({
      id: 'path-1',
      name: 'Backend Intern Path',
      generated: true,
      summary: 'Bat dau voi Product Overview.',
      payload: {
        type: 'learning-path',
        version: 1,
        pathId: 'path-1',
        title: 'Backend Intern Path',
        description: 'Lo trinh hoc ca nhan hoa',
        contextLabel: 'Gap: Node.js',
        generated: true,
        items: [
          {
            orderNo: 1,
            courseId: 'course-1',
            courseCode: 'prod-overview',
            courseTitle: 'Product Overview',
            required: true,
            reason: 'Mon nen tang bat buoc',
            estimatedHours: 2,
            status: 'not_started',
          },
        ],
        summary: 'Bat dau voi Product Overview.',
      },
      items: [],
    });

    const stream = await service.processMessage(
      'user-1',
      'Toi nen hoc khoa nao truoc?',
      'session-path',
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

    expect(trainingService.generateLearningPathForUser).toHaveBeenCalledWith('user-1', {
      queryText: 'Toi nen hoc khoa nao truoc?',
      includeMandatoryCourses: true,
    });
    expect(events.some((event) => event?.data?.uiPayload?.type === 'learning-path')).toBe(true);
    expect(conversationService.saveMessage).toHaveBeenLastCalledWith(
      'conv-path',
      'assistant',
      expect.stringContaining('lo trinh'),
      undefined,
      expect.objectContaining({
        orchestration: 'mock',
        uiPayloadVersion: 1,
        uiPayload: expect.objectContaining({
          type: 'learning-path',
          pathId: 'path-1',
        }),
      }),
    );
  });

  it('should degrade analytics requests to chat-safe text until agent orchestration is available', async () => {
    conversationService.getOrCreateConversation.mockResolvedValue({
      id: 'conv-analytics',
    });
    conversationService.saveMessage.mockResolvedValue(undefined);
    contextBuilderService.build.mockResolvedValue({
      user: { id: 'manager-1' },
      session: { conversationId: 'conv-analytics' },
      allowedResources: { documents: [], tools: [], scopes: [] },
    });
    trainingService.generateQuizForUser.mockResolvedValue(null);
    trainingService.generateLearningPathForUser.mockResolvedValue(null);
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

  it('should degrade analytics requests to chat-safe text when OpenClaw orchestration fails', async () => {
    conversationService.getOrCreateConversation.mockResolvedValue({
      id: 'conv-analytics-fallback',
    });
    conversationService.saveMessage.mockResolvedValue(undefined);
    contextBuilderService.build.mockResolvedValue({
      user: { id: 'manager-1' },
      session: { conversationId: 'conv-analytics-fallback' },
      allowedResources: { documents: [], tools: [], scopes: [] },
    });
    trainingService.generateQuizForUser.mockResolvedValue(null);
    trainingService.generateLearningPathForUser.mockResolvedValue(null);
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
      'Khong the tai bao cao analytics luc nay. Vui long thu lai sau.',
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
