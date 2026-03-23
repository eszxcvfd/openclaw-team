import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { GenerateLearningPathDto } from './dto/generate-learning-path.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import {
  LearningPathDto,
  LearningRecommendationDto,
  QuizAttemptResultDto,
  TrainingService,
} from './training.service';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
  };
};

@Controller('api')
@UseGuards(JwtAuthGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('me/training-recommendations')
  async getTrainingRecommendations(
    @Request() request: AuthenticatedRequest,
  ): Promise<LearningRecommendationDto[]> {
    return this.trainingService.getTrainingRecommendationsForUser(request.user.userId);
  }

  @Get('me/learning-path')
  async getLearningPath(
    @Request() request: AuthenticatedRequest,
  ): Promise<LearningPathDto> {
    return this.trainingService.getLearningPathForUser(request.user.userId);
  }

  @Post('me/learning-path/generate')
  async generateLearningPath(
    @Request() request: AuthenticatedRequest,
    @Body() body: GenerateLearningPathDto,
  ): Promise<LearningPathDto> {
    return this.trainingService.generateLearningPathForUser(request.user.userId, body);
  }

  @Post('quiz/submit')
  async submitQuiz(
    @Request() request: AuthenticatedRequest,
    @Body() body: SubmitQuizDto,
  ): Promise<QuizAttemptResultDto> {
    return this.trainingService.submitQuizAttempt(request.user.userId, body);
  }

  @Get('quiz/:id/result')
  async getQuizResult(
    @Request() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<QuizAttemptResultDto> {
    return this.trainingService.getQuizAttemptResult(request.user.userId, id);
  }
}
