import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ContextBuilderService } from './context-builder.service';

describe('ContextBuilderService', () => {
  let service: ContextBuilderService;
  let prisma: {
    users: { findUnique: jest.Mock };
    conversations: { findUnique: jest.Mock };
    messages: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      users: {
        findUnique: jest.fn(),
      },
      conversations: {
        findUnique: jest.fn(),
      },
      messages: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextBuilderService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ContextBuilderService>(ContextBuilderService);
  });

  describe('buildUserContext', () => {
    it('should build user context with department, position, and roles', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: 'user-1',
        full_name: 'Nguyen Van A',
        email: 'a@example.com',
        departments: { name: 'Engineering' },
        positions: { name: 'Intern' },
        user_roles: [
          { roles: { code: 'employee' } },
          { roles: { code: 'onboarding_user' } },
        ],
      });

      await expect(service.buildUserContext('user-1')).resolves.toEqual({
        id: 'user-1',
        fullName: 'Nguyen Van A',
        email: 'a@example.com',
        department: 'Engineering',
        position: 'Intern',
        roles: ['employee', 'onboarding_user'],
      });

      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          departments: true,
          positions: true,
          user_roles: {
            include: {
              roles: true,
            },
          },
        },
      });
    });

    it('should throw when the user cannot be found', async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(service.buildUserContext('missing-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('buildConversationContext', () => {
    it('should return the latest 10 turns in chronological order', async () => {
      prisma.conversations.findUnique.mockResolvedValue({
        id: 'conv-1',
        started_at: new Date('2026-03-22T08:00:00.000Z'),
        agent_groups: { code: 'onboarding_assistant' },
        _count: { messages: 12 },
      });

      prisma.messages.findMany.mockResolvedValue([
        {
          id: 'msg-12',
          sender_type: 'assistant',
          content: 'turn 12',
          created_at: new Date('2026-03-22T08:11:00.000Z'),
        },
        {
          id: 'msg-11',
          sender_type: 'user',
          content: 'turn 11',
          created_at: new Date('2026-03-22T08:10:00.000Z'),
        },
      ]);

      await expect(service.buildConversationContext('conv-1')).resolves.toEqual({
        conversationId: 'conv-1',
        agentGroup: 'onboarding_assistant',
        startedAt: '2026-03-22T08:00:00.000Z',
        messageCount: 12,
        recentTurns: [
          {
            id: 'msg-11',
            senderType: 'user',
            content: 'turn 11',
            createdAt: '2026-03-22T08:10:00.000Z',
          },
          {
            id: 'msg-12',
            senderType: 'assistant',
            content: 'turn 12',
            createdAt: '2026-03-22T08:11:00.000Z',
          },
        ],
      });

      expect(prisma.messages.findMany).toHaveBeenCalledWith({
        where: { conversation_id: 'conv-1' },
        orderBy: { created_at: 'desc' },
        take: 10,
      });
    });

    it('should throw when the conversation cannot be found', async () => {
      prisma.conversations.findUnique.mockResolvedValue(null);

      await expect(
        service.buildConversationContext('missing-conversation'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('build', () => {
    it('should aggregate user and session context into the prompt payload', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: 'user-1',
        full_name: 'Nguyen Van A',
        email: 'a@example.com',
        departments: { name: 'Engineering' },
        positions: { name: 'Intern' },
        user_roles: [{ roles: { code: 'employee' } }],
      });
      prisma.conversations.findUnique.mockResolvedValue({
        id: 'conv-1',
        started_at: new Date('2026-03-22T08:00:00.000Z'),
        agent_groups: null,
        _count: { messages: 1 },
      });
      prisma.messages.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          sender_type: 'user',
          content: 'Xin chao',
          created_at: new Date('2026-03-22T08:01:00.000Z'),
        },
      ]);

      await expect(service.build('user-1', 'conv-1')).resolves.toEqual({
        user: {
          id: 'user-1',
          fullName: 'Nguyen Van A',
          email: 'a@example.com',
          department: 'Engineering',
          position: 'Intern',
          roles: ['employee'],
        },
        session: {
          conversationId: 'conv-1',
          agentGroup: null,
          startedAt: '2026-03-22T08:00:00.000Z',
          messageCount: 1,
          recentTurns: [
            {
              id: 'msg-1',
              senderType: 'user',
              content: 'Xin chao',
              createdAt: '2026-03-22T08:01:00.000Z',
            },
          ],
        },
        allowedResources: {
          documents: [],
          tools: [],
          scopes: [],
        },
      });
    });
  });
});
