import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest, Response } from 'express';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
  };
};

@Controller('api/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('message')
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Body() body: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user.userId;
    const stream = await this.chatService.processMessage(userId, body.message, body.sessionKey);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const subscription = stream.subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event?.data ?? event ?? {})}\n\n`);
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Stream error';
        res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    req.on('close', () => {
      subscription.unsubscribe();
      if (!res.writableEnded) {
        res.end();
      }
    });
  }

  @Get('conversations')
  async listConversations(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.conversationService.listConversations(userId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.conversationService.getMessagesForUser(req.user.userId, id);
  }
}
