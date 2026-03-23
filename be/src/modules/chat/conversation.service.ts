import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type MessageMetadata = Prisma.InputJsonObject;

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConversation(userId: string, agentGroupCode?: string, sessionKey?: string) {
    const key = sessionKey || `default-${userId}`;
    
    let agentGroupId = null;
    if (agentGroupCode) {
      const group = await this.prisma.agent_groups.findUnique({
        where: { code: agentGroupCode },
      });
      agentGroupId = group?.id;
    }

    return this.prisma.conversations.upsert({
      where: {
        user_id_session_key: {
          user_id: userId,
          session_key: key,
        },
      },
      update: {
        status: 'open',
      },
      create: {
        user_id: userId,
        session_key: key,
        agent_group_id: agentGroupId,
        status: 'open',
      },
    });
  }

  async saveMessage(
    conversationId: string,
    senderType: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    userId?: string,
    metadata: MessageMetadata = {},
  ) {
    return this.prisma.messages.create({
      data: {
        conversation_id: conversationId,
        sender_type: senderType,
        sender_user_id: userId,
        content,
        metadata: this.toJsonObject(metadata),
      },
    });
  }

  async getMessagesForUser(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversations.findFirst({
      where: {
        id: conversationId,
        user_id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    return this.prisma.messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        sender_type: true,
        content: true,
        metadata: true,
        created_at: true,
      },
    });
  }

  async listConversations(userId: string) {
    const conversations = await this.prisma.conversations.findMany({
      where: { user_id: userId },
      include: {
        agent_groups: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            content: true,
          },
        },
      },
      orderBy: { started_at: 'desc' },
    });

    return conversations.map(({ messages, ...conversation }) => ({
      ...conversation,
      preview: messages[0]?.content?.trim() || null,
    }));
  }

  private toJsonObject(value: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }
}
