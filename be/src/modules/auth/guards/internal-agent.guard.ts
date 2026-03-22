import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InternalTokenService } from '../internal-token.service';
import { AGENT_SCOPE_KEY } from '../decorators/agent-scope.decorator';

@Injectable()
export class InternalAgentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private internalTokenService: InternalTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(AGENT_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid internal agent token.');
    }

    const token = authHeader.split(' ')[1];
    const payload = await this.internalTokenService.verifyToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired internal agent token.');
    }

    this.assertHeaderMatchesPayload(request, payload);
    this.assertOwnershipMatchesPayload(request, payload);

    // Attach agent payload to request
    request.internalAgent = payload;

    // Check scopes if required
    if (requiredScopes && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every((scope) =>
        payload.scope.includes(scope),
      );

      if (!hasAllScopes) {
        throw new ForbiddenException({
          code: 'TOOL_ACCESS_DENIED',
          message: 'Agent lacks required scope for this tool.',
          details: {
            required: requiredScopes,
            provided: payload.scope,
          },
        });
      }
    }

    return true;
  }

  private assertHeaderMatchesPayload(
    request: Record<string, any>,
    payload: { agent: string; userId: string; conversationId: string },
  ) {
    const agentNameHeader = this.readHeader(request.headers, 'x-agent-name');
    const userIdHeader = this.readHeader(request.headers, 'x-user-id');
    const conversationIdHeader = this.readHeader(request.headers, 'x-conversation-id');

    if (agentNameHeader && agentNameHeader !== payload.agent) {
      throw new ForbiddenException({
        code: 'TOOL_ACCESS_DENIED',
        message: 'Agent header does not match internal token payload.',
        details: {
          headerAgent: agentNameHeader,
          tokenAgent: payload.agent,
        },
      });
    }

    if (userIdHeader && userIdHeader !== payload.userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'User header does not match internal token payload.',
        details: {
          headerUserId: userIdHeader,
          tokenUserId: payload.userId,
        },
      });
    }

    if (conversationIdHeader && conversationIdHeader !== payload.conversationId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Conversation header does not match internal token payload.',
        details: {
          headerConversationId: conversationIdHeader,
          tokenConversationId: payload.conversationId,
        },
      });
    }
  }

  private assertOwnershipMatchesPayload(
    request: Record<string, any>,
    payload: { userId: string; conversationId: string },
  ) {
    const userIdCandidates = this.collectCandidates(request, [
      'userId',
      'user_id',
    ]);
    const conversationCandidates = this.collectCandidates(request, [
      'conversationId',
      'conversation_id',
    ]);

    if (
      userIdCandidates.some(
        (candidate) => candidate && candidate !== payload.userId,
      )
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Requested user data does not belong to the token user.',
        details: {
          tokenUserId: payload.userId,
          requestedUserIds: userIdCandidates,
        },
      });
    }

    if (
      conversationCandidates.some(
        (candidate) => candidate && candidate !== payload.conversationId,
      )
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Requested conversation does not belong to the token conversation.',
        details: {
          tokenConversationId: payload.conversationId,
          requestedConversationIds: conversationCandidates,
        },
      });
    }
  }

  private collectCandidates(
    request: Record<string, any>,
    keys: string[],
  ) {
    const sources = [request.params, request.query, request.body];

    return sources
      .flatMap((source) =>
        keys
          .map((key) => source?.[key])
          .filter((value): value is string => typeof value === 'string'),
      );
  }

  private readHeader(headers: Record<string, any>, key: string) {
    const value = headers?.[key];

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value[0];
    }

    return undefined;
  }
}
