import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import { AgentRouterService } from '../agent-router/agent-router.service';
import { InternalTokenService } from '../auth/internal-token.service';
import {
  BuiltPromptContext,
  ContextBuilderService,
} from '../context-builder/context-builder.service';
import { OpenclawService } from '../openclaw/openclaw.service';
import { ConversationService } from './conversation.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly agentRouterService: AgentRouterService,
    private readonly contextBuilderService: ContextBuilderService,
    private readonly internalTokenService: InternalTokenService,
    private readonly openclawService: OpenclawService,
  ) {}

  async processMessage(
    userId: string,
    message: string,
    sessionKey?: string,
  ): Promise<Observable<any>> {
    const existingConversation = await this.conversationService.findConversationBySession(
      userId,
      sessionKey,
    );
    const routedAgent = await this.agentRouterService.routeMessage({
      userId,
      message,
      currentAgentGroup: existingConversation?.agent_groups?.code ?? null,
    });
    const conversation = await this.conversationService.getOrCreateConversation(
      userId,
      routedAgent.agentGroup,
      sessionKey,
    );

    await this.conversationService.saveMessage(
      conversation.id,
      'user',
      message,
      userId,
    );

    const promptContext = await this.contextBuilderService.build(
      userId,
      conversation.id,
      {
        agentGroup: routedAgent.agentGroup,
        allowedResources: routedAgent.allowedResources,
      },
    );

    const eventStream = new Subject<any>();

    this.streamAgentResponse(
      conversation.id,
      userId,
      message,
      eventStream,
      promptContext,
      routedAgent.agentGroup,
      routedAgent.allowedResources.scopes,
    );

    return eventStream.asObservable();
  }

  private async streamAgentResponse(
    conversationId: string,
    userId: string,
    message: string,
    eventStream: Subject<any>,
    promptContext: BuiltPromptContext,
    agentGroup: string,
    scopes: string[],
  ) {
    const agentResponse = await this.buildAgentResponse({
      userId,
      message,
      promptContext,
      conversationId,
      agentGroup,
      scopes,
    });
    const uiPayload = agentResponse.uiPayload;
    const fullResponse =
      agentResponse.text ||
      'He thong da tiep nhan yeu cau cua ban nhung chua the sinh cau tra loi luc nay.';
    const words = fullResponse.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      currentText += (i === 0 ? '' : ' ') + words[i];
      eventStream.next({ data: { chunk: `${words[i]} `, full: currentText } });
    }

    if (uiPayload) {
      eventStream.next({
        data: {
          uiPayload,
        },
      });
    }

    await this.conversationService.saveMessage(
      conversationId,
      'assistant',
      fullResponse,
      undefined,
      this.buildAssistantMetadata(uiPayload, agentResponse),
    );

    eventStream.complete();
  }

  private async buildAgentResponse({
    userId,
    message,
    promptContext,
    conversationId,
    agentGroup,
    scopes,
  }: {
    userId: string;
    message: string;
    promptContext: BuiltPromptContext;
    conversationId: string;
    agentGroup: string;
    scopes: string[];
  }) {
    const traceId = randomUUID();

    try {
      const internalToken = await this.internalTokenService.createToken(
        agentGroup,
        userId,
        conversationId,
        scopes,
      );
      const response = await this.openclawService.run({
        agentName: agentGroup,
        message,
        context: promptContext,
        internalToken,
        conversationId,
        userId,
        traceId,
        backendBaseUrl: this.resolveBackendBaseUrl(),
      });

      return {
        text:
          response.text ||
          'Toi da xu ly yeu cau cua ban theo pham vi duoc phep.',
        uiPayload: response.uiPayload,
        orchestration: 'openclaw',
        traceId,
        agentName: agentGroup,
      };
    } catch {
      return {
        text: 'Khong the xu ly yeu cau qua OpenClaw luc nay. Vui long thu lai sau.',
        uiPayload: null,
        orchestration: 'openclaw-fallback',
        traceId,
        agentName: agentGroup,
      };
    }
  }

  private buildAssistantMetadata(
    uiPayload: unknown,
    analyticsResponse?: {
      orchestration: string;
      traceId: string;
      agentName: string;
    } | null,
  ) {
    const normalizedPayload =
      uiPayload && typeof uiPayload === 'object' && !Array.isArray(uiPayload)
        ? (uiPayload as Record<string, unknown>)
        : null;

    return JSON.parse(
      JSON.stringify({
        orchestration: analyticsResponse?.orchestration ?? 'mock',
        traceId: analyticsResponse?.traceId,
        agentName: analyticsResponse?.agentName,
        uiPayloadVersion: normalizedPayload?.version ?? null,
        uiPayload: normalizedPayload,
      }),
    ) as Prisma.InputJsonObject;
  }

  private resolveBackendBaseUrl() {
    return process.env.APP_BASE_URL?.trim() || `http://localhost:${Number(process.env.PORT) || 3001}`;
  }
}
