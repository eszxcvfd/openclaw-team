import { Test, TestingModule } from '@nestjs/testing';
import { ContextBuilderService } from '../context-builder/context-builder.service';
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

  beforeEach(async () => {
    jest.useFakeTimers();

    conversationService = {
      getOrCreateConversation: jest.fn(),
      saveMessage: jest.fn(),
    };

    contextBuilderService = {
      build: jest.fn(),
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
      },
    );
  });
});
