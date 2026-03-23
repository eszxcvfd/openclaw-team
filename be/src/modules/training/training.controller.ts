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
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizAttemptResultDto, TrainingService } from './training.service';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
  };
};

@Controller('api/quiz')
@UseGuards(JwtAuthGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('submit')
  async submitQuiz(
    @Request() request: AuthenticatedRequest,
    @Body() body: SubmitQuizDto,
  ): Promise<QuizAttemptResultDto> {
    return this.trainingService.submitQuizAttempt(request.user.userId, body);
  }

  @Get(':id/result')
  async getQuizResult(
    @Request() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<QuizAttemptResultDto> {
    return this.trainingService.getQuizAttemptResult(request.user.userId, id);
  }
}
