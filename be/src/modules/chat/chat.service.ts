import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import {
  BuiltPromptContext,
  ContextBuilderService,
} from '../context-builder/context-builder.service';
import { TrainingService } from '../training/training.service';
import { ConversationService } from './conversation.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly contextBuilderService: ContextBuilderService,
    private readonly trainingService: TrainingService,
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
    const fullResponse = quizPayload
      ? 'Toi da tao mot mini quiz ngan de ban tu danh gia nhanh ngay trong khung chat nay.'
      : 'Chao ban! Toi la tro ly OpenClaw. He thong dang trong qua trinh hoan thien cac module nghiep vu. Toi co the giup gi cho ban hom nay?';
    const words = fullResponse.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      currentText += (i === 0 ? '' : ' ') + words[i];
      eventStream.next({ data: { chunk: `${words[i]} `, full: currentText } });
    }

    if (quizPayload) {
      eventStream.next({
        data: {
          uiPayload: quizPayload,
        },
      });
    }

    await this.conversationService.saveMessage(
      conversationId,
      'assistant',
      fullResponse,
      undefined,
      this.buildAssistantMetadata(quizPayload),
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

  private looksLikeQuizRequest(message: string) {
    return /(quiz|trac nghiem|kiem tra|test)/i.test(message);
  }

  private buildAssistantMetadata(quizPayload: Awaited<ReturnType<ChatService['buildQuizPayloadIfRequested']>>) {
    return JSON.parse(
      JSON.stringify({
        orchestration: 'mock',
        uiPayloadVersion: quizPayload?.version ?? null,
        uiPayload: quizPayload,
      }),
    ) as Prisma.InputJsonObject;
  }
}
