import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import {
  BuiltPromptContext,
  ContextBuilderService,
} from '../context-builder/context-builder.service';
import { ConversationService } from './conversation.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly contextBuilderService: ContextBuilderService,
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

    this.mockStreamingResponse(conversation.id, eventStream, promptContext);

    return eventStream.asObservable();
  }

  private async mockStreamingResponse(
    conversationId: string,
    eventStream: Subject<any>,
    promptContext: BuiltPromptContext,
  ) {
    const fullResponse =
      'Chao ban! Toi la tro ly OpenClaw. He thong dang trong qua trinh hoan thien cac module nghiep vu. Toi co the giup gi cho ban hom nay?';
    const words = fullResponse.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      currentText += (i === 0 ? '' : ' ') + words[i];
      eventStream.next({ data: { chunk: `${words[i]} `, full: currentText } });
    }

    await this.conversationService.saveMessage(
      conversationId,
      'assistant',
      fullResponse,
      undefined,
      {
        orchestration: 'mock',
      },
    );

    eventStream.complete();
  }
}
