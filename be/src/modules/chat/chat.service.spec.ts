import { Test, TestingModule } from '@nestjs/testing';
import { ContextBuilderService } from '../context-builder/context-builder.service';
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
});
