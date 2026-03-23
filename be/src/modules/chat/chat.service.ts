import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import { InternalTokenService } from '../auth/internal-token.service';
import {
  BuiltPromptContext,
  ContextBuilderService,
} from '../context-builder/context-builder.service';
import { OpenclawService } from '../openclaw/openclaw.service';
import { TrainingService } from '../training/training.service';
import { ConversationService } from './conversation.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly contextBuilderService: ContextBuilderService,
    private readonly trainingService: TrainingService,
    private readonly internalTokenService: InternalTokenService,
    private readonly openclawService: OpenclawService,
  ) {}

  async processMessage(
    userId: string,
    message: string,
    sessionKey?: string,
  ): Promise<Observable<any>> {
    const conversation = await this.conversationService.getOrCreateConversation(
      userId,
      undefined,
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
    );

    const eventStream = new Subject<any>();

    this.mockStreamingResponse(
      conversation.id,
      userId,
      message,
      eventStream,
      promptContext,
    );

    return eventStream.asObservable();
  }

  private async mockStreamingResponse(
    conversationId: string,
    userId: string,
    message: string,
    eventStream: Subject<any>,
    promptContext: BuiltPromptContext,
  ) {
    const quizPayload = await this.buildQuizPayloadIfRequested(userId, message);
    const learningPath = quizPayload
      ? null
      : await this.buildLearningPathIfRequested(userId, message);
    const isAnalyticsRequest = this.looksLikeAnalyticsSummaryRequest(message);
    const analyticsResponse =
      !quizPayload && !learningPath && isAnalyticsRequest
        ? await this.buildAnalyticsResponse({
            userId,
            message,
            promptContext,
            conversationId,
          })
        : null;
    const uiPayload = quizPayload ?? learningPath?.payload ?? analyticsResponse?.uiPayload ?? null;
    const fullResponse = quizPayload
      ? 'Toi da tao mot mini quiz ngan de ban tu danh gia nhanh ngay trong khung chat nay.'
      : learningPath
        ? `Toi da goi y lo trinh hoc cho ban. ${learningPath.summary || ''}`.trim()
        : analyticsResponse
          ? analyticsResponse.text
          : 'Chao ban! Toi la tro ly OpenClaw. He thong dang trong qua trinh hoan thien cac module nghiep vu. Toi co the giup gi cho ban hom nay?';
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
      this.buildAssistantMetadata(uiPayload, analyticsResponse),
    );

    eventStream.complete();
  }

  private async buildQuizPayloadIfRequested(userId: string, message: string) {
    if (!this.looksLikeQuizRequest(message)) {
      return null;
    }

    try {
      return await this.trainingService.generateQuizForUser(userId, {
        queryText: message,
      });
    } catch {
      return null;
    }
  }

  private async buildLearningPathIfRequested(userId: string, message: string) {
    if (!this.looksLikeLearningPathRequest(message)) {
      return null;
    }

    try {
      return await this.trainingService.generateLearningPathForUser(userId, {
        queryText: message,
        includeMandatoryCourses: true,
      });
    } catch {
      return null;
    }
  }

  private looksLikeQuizRequest(message: string) {
    return /(quiz|trac nghiem|kiem tra|test)/i.test(message);
  }

  private looksLikeLearningPathRequest(message: string) {
    return /(lo trinh|learning path|goi y hoc|nen hoc|khoa nao truoc|dao tao)/i.test(message);
  }

  private looksLikeAnalyticsSummaryRequest(message: string) {
    return /(bao cao|analytics|phan tich|tong hop).*(phong ban|dao tao)|(phong ban|dao tao).*(bao cao|analytics|phan tich|tong hop)/i.test(
      message,
    );
  }

  private async buildAnalyticsResponse({
    userId,
    message,
    promptContext,
    conversationId,
  }: {
    userId: string;
    message: string;
    promptContext: BuiltPromptContext;
    conversationId: string;
  }) {
    const traceId = randomUUID();

    try {
      const internalToken = await this.internalTokenService.createToken(
        'training_analytics_agent',
        userId,
        conversationId,
        ['read:analytics'],
      );
      const analyticsContext: BuiltPromptContext = {
        ...promptContext,
        session: {
          ...promptContext.session,
          agentGroup: 'training_analytics_agent',
        },
        allowedResources: {
          ...promptContext.allowedResources,
          tools: ['get_department_training_analytics'],
          scopes: ['read:analytics'],
        },
      };
      const response = await this.openclawService.run({
        agentName: 'training_analytics_agent',
        message,
        context: analyticsContext,
        internalToken,
        conversationId,
        userId,
        traceId,
      });

      return {
        text:
          response.text ||
          'Toi da tong hop bao cao analytics theo pham vi duoc phep cua ban.',
        uiPayload: response.uiPayload,
        orchestration: 'openclaw',
        traceId,
        agentName: 'training_analytics_agent',
      };
    } catch {
      return {
        text: 'Khong the tai bao cao analytics luc nay. Vui long thu lai sau.',
        uiPayload: null,
        orchestration: 'openclaw-fallback',
        traceId,
        agentName: 'training_analytics_agent',
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
}
