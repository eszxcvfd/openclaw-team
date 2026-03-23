import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface BuiltUserContext {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  position: string | null;
  roles: string[];
}

export interface ConversationTurnContext {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
}

export interface BuiltConversationContext {
  conversationId: string;
  agentGroup: string | null;
  startedAt: string;
  messageCount: number;
  recentTurns: ConversationTurnContext[];
}

export interface BuiltPromptContext {
  user: BuiltUserContext;
  session: BuiltConversationContext;
  allowedResources: {
    documents: string[];
    tools: string[];
    scopes: string[];
  };
}

export interface BuildContextOptions {
  agentGroup?: string | null;
  allowedResources?: Partial<BuiltPromptContext['allowedResources']>;
}

@Injectable()
export class ContextBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async build(
    userId: string,
    conversationId: string,
    options: BuildContextOptions = {},
  ): Promise<BuiltPromptContext> {
    const [user, session, documents] = await Promise.all([
      this.buildUserContext(userId),
      this.buildConversationContext(conversationId, options.agentGroup),
      this.buildAllowedDocuments(userId),
    ]);

    return {
      user,
      session,
      allowedResources: {
        documents,
        tools: options.allowedResources?.tools ?? [],
        scopes: options.allowedResources?.scopes ?? [],
      },
    };
  }

  async buildUserContext(userId: string): Promise<BuiltUserContext> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      department: user.departments?.name ?? null,
      position: user.positions?.name ?? null,
      roles: user.user_roles.map(({ roles }) => roles.code),
    };
  }

  async buildConversationContext(
    conversationId: string,
    agentGroupOverride?: string | null,
  ): Promise<BuiltConversationContext> {
    const conversation = await this.prisma.conversations.findUnique({
      where: { id: conversationId },
      include: {
        agent_groups: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    const recentMessages = await this.prisma.messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return {
      conversationId: conversation.id,
      agentGroup: agentGroupOverride ?? conversation.agent_groups?.code ?? null,
      startedAt: conversation.started_at.toISOString(),
      messageCount: conversation._count.messages,
      recentTurns: recentMessages.reverse().map((message) => ({
        id: message.id,
        senderType: message.sender_type,
        content: message.content ?? '',
        createdAt: message.created_at.toISOString(),
      })),
    };
  }

  private async buildAllowedDocuments(userId: string) {
    const roleAssignments = await this.prisma.user_roles.findMany({
      where: {
        user_id: userId,
      },
      select: {
        role_id: true,
      },
    });

    if (roleAssignments.length === 0) {
      return [];
    }

    const documents = await this.prisma.documents.findMany({
      where: {
        is_active: true,
        document_permissions: {
          some: {
            role_id: {
              in: roleAssignments.map((entry) => entry.role_id),
            },
            can_view: true,
          },
        },
      },
      select: {
        code: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return documents
      .map((document) => document.code?.trim())
      .filter((document): document is string => Boolean(document));
  }
}
