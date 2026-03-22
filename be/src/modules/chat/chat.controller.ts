import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
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
  @Sse()
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Body() body: SendMessageDto,
  ): Promise<Observable<any>> {
    const userId = req.user.userId;
    return this.chatService.processMessage(userId, body.message, body.sessionKey);
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
