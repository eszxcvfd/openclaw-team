import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { AgentScope } from '../auth/decorators/agent-scope.decorator';
import { InternalAgentGuard } from '../auth/guards/internal-agent.guard';
import { GenerateLearningPathDto } from './dto/generate-learning-path.dto';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import {
  LearningPathDto,
  LearningRecommendationDto,
  QuizPayloadDto,
  TrainingService,
} from './training.service';

interface InternalAgentRequest {
  internalAgent: {
    userId: string;
  };
}

@Controller('internal/tools/training')
export class TrainingInternalController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('me/training-recommendations')
  @UseGuards(InternalAgentGuard)
  @AgentScope('read:training')
  async getTrainingRecommendations(
    @Req() request: InternalAgentRequest,
  ): Promise<LearningRecommendationDto[]> {
    return this.trainingService.getTrainingRecommendationsForUser(request.internalAgent.userId);
  }

  @Get('me/learning-path')
  @UseGuards(InternalAgentGuard)
  @AgentScope('read:training')
  async getLearningPath(
    @Req() request: InternalAgentRequest,
  ): Promise<LearningPathDto> {
    return this.trainingService.getLearningPathForUser(request.internalAgent.userId);
  }

  @Post('me/learning-path/generate')
  @UseGuards(InternalAgentGuard)
  @AgentScope('write:training')
  async generateLearningPath(
    @Req() request: InternalAgentRequest,
    @Body() body: GenerateLearningPathDto,
  ): Promise<LearningPathDto> {
    return this.trainingService.generateLearningPathForUser(request.internalAgent.userId, body);
  }

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
