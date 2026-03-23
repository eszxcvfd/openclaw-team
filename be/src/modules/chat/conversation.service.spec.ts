import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let prisma: {
    conversations: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    messages: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      conversations: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      messages: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  describe('getMessagesForUser', () => {
    it('should only return messages from a conversation owned by the user', async () => {
      prisma.conversations.findFirst.mockResolvedValue({ id: 'conv-1' });
      prisma.messages.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          sender_type: 'user',
          content: 'Hello',
          metadata: { uiPayload: { type: 'quiz', version: 1 } },
          created_at: new Date('2026-03-22T08:00:00.000Z'),
        },
      ]);

      await expect(
        service.getMessagesForUser('user-1', 'conv-1'),
      ).resolves.toEqual([
        {
          id: 'msg-1',
          sender_type: 'user',
          content: 'Hello',
          metadata: { uiPayload: { type: 'quiz', version: 1 } },
          created_at: new Date('2026-03-22T08:00:00.000Z'),
        },
      ]);

      expect(prisma.conversations.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'conv-1',
          user_id: 'user-1',
        },
        select: {
          id: true,
        },
      });
      expect(prisma.messages.findMany).toHaveBeenCalledWith({
        where: { conversation_id: 'conv-1' },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          sender_type: true,
          content: true,
          metadata: true,
          created_at: true,
        },
      });
    });

    it('should throw when the conversation is not owned by the user', async () => {
      prisma.conversations.findFirst.mockResolvedValue(null);

      await expect(
        service.getMessagesForUser('user-1', 'conv-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listConversations', () => {
    it('should attach a preview derived from the latest message', async () => {
      prisma.conversations.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          session_key: 'session-1',
          started_at: new Date('2026-03-22T08:00:00.000Z'),
          agent_groups: null,
          messages: [{ content: 'Latest assistant reply' }],
        },
      ]);

      await expect(service.listConversations('user-1')).resolves.toEqual([
        {
          id: 'conv-1',
          session_key: 'session-1',
          started_at: new Date('2026-03-22T08:00:00.000Z'),
          agent_groups: null,
          preview: 'Latest assistant reply',
        },
      ]);
    });
  });

  describe('saveMessage', () => {
    it('should persist arbitrary metadata for later history rehydration', async () => {
      prisma.messages.create.mockResolvedValue({ id: 'msg-quiz' });

      await service.saveMessage(
        'conv-1',
        'assistant',
        'Quiz ready',
        undefined,
        {
          uiPayloadVersion: 1,
          uiPayload: { type: 'quiz', quizId: 'quiz-1' },
        },
      );

      expect(prisma.messages.create).toHaveBeenCalledWith({
        data: {
          conversation_id: 'conv-1',
          sender_type: 'assistant',
          sender_user_id: undefined,
          content: 'Quiz ready',
          metadata: {
            uiPayloadVersion: 1,
            uiPayload: { type: 'quiz', quizId: 'quiz-1' },
          },
        },
      });
    });
  });
});
