import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { AgentRouterModule } from '../agent-router/agent-router.module';
import { AuthModule } from '../auth/auth.module';
import { ContextBuilderModule } from '../context-builder/context-builder.module';
import { OpenclawModule } from '../openclaw/openclaw.module';

@Module({
  imports: [AuthModule, AgentRouterModule, ContextBuilderModule, OpenclawModule],
  controllers: [ChatController],
  providers: [ChatService, ConversationService],
  exports: [ChatService, ConversationService],
})
export class ChatModule {}
