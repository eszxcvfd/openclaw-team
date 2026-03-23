import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { AuthModule } from '../auth/auth.module';
import { ContextBuilderModule } from '../context-builder/context-builder.module';
import { TrainingModule } from '../training/training.module';

@Module({
  imports: [AuthModule, ContextBuilderModule, TrainingModule],
  controllers: [ChatController],
  providers: [ChatService, ConversationService],
  exports: [ChatService, ConversationService],
})
export class ChatModule {}
