import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { AgentScope } from '../auth/decorators/agent-scope.decorator';
import { InternalAgentGuard } from '../auth/guards/internal-agent.guard';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { QuizPayloadDto, TrainingService } from './training.service';

interface InternalAgentRequest {
  internalAgent: {
    userId: string;
  };
}

@Controller('internal/tools/training')
export class TrainingInternalController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('quiz/generate')
  @UseGuards(InternalAgentGuard)
  @AgentScope('write:training')
  async generateQuiz(
    @Req() request: InternalAgentRequest,
    @Body() body: GenerateQuizDto,
  ): Promise<QuizPayloadDto> {
    return this.trainingService.generateQuizForUser(request.internalAgent.userId, body);
  }
}
