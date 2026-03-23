import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

describe('TrainingController', () => {
  let controller: TrainingController;
  let service: {
    submitQuizAttempt: jest.Mock;
    getQuizAttemptResult: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      submitQuizAttempt: jest.fn(),
      getQuizAttemptResult: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingController],
      providers: [
        {
          provide: TrainingService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TrainingController>(TrainingController);
  });

  it('should submit quiz attempts for the authenticated user only', async () => {
    const result = {
      attemptId: '550e8400-e29b-41d4-a716-446655440011',
      quizId: '550e8400-e29b-41d4-a716-446655440010',
      title: 'NodeJS Basics',
      difficulty: 'easy',
      course: null,
      score: 1,
      maxScore: 1,
      scorePercent: 100,
      correctCount: 1,
      totalQuestions: 1,
      durationSeconds: 32,
      submittedAt: '2026-03-23T01:00:00.000Z',
      questionResults: [],
    };
    service.submitQuizAttempt.mockResolvedValue(result);

    await expect(
      controller.submitQuiz(
        { user: { userId: 'user-1' } } as never,
        {
          quizId: '550e8400-e29b-41d4-a716-446655440010',
          assistantMessageId: '550e8400-e29b-41d4-a716-446655440013',
          durationSeconds: 32,
          answers: [
            {
              questionId: '550e8400-e29b-41d4-a716-446655440012',
              answer: 'node',
            },
          ],
        },
      ),
    ).resolves.toEqual(result);

    expect(service.submitQuizAttempt).toHaveBeenCalledWith('user-1', {
      quizId: '550e8400-e29b-41d4-a716-446655440010',
      assistantMessageId: '550e8400-e29b-41d4-a716-446655440013',
      durationSeconds: 32,
      answers: [
        {
          questionId: '550e8400-e29b-41d4-a716-446655440012',
          answer: 'node',
        },
      ],
    });
  });

  it('should fetch quiz results for the authenticated user only', async () => {
    const result = {
      attemptId: '550e8400-e29b-41d4-a716-446655440011',
      quizId: '550e8400-e29b-41d4-a716-446655440010',
      title: 'NodeJS Basics',
      difficulty: 'easy',
      course: null,
      score: 1,
      maxScore: 1,
      scorePercent: 100,
      correctCount: 1,
      totalQuestions: 1,
      durationSeconds: 32,
      submittedAt: '2026-03-23T01:00:00.000Z',
      questionResults: [],
    };
    service.getQuizAttemptResult.mockResolvedValue(result);

    await expect(
      controller.getQuizResult(
        { user: { userId: 'user-1' } } as never,
        '550e8400-e29b-41d4-a716-446655440011',
      ),
    ).resolves.toEqual(result);

    expect(service.getQuizAttemptResult).toHaveBeenCalledWith(
      'user-1',
      '550e8400-e29b-41d4-a716-446655440011',
    );
  });

  it('should validate attempt id values with ParseUUIDPipe', async () => {
    const pipe = new ParseUUIDPipe();

    await expect(
      pipe.transform('not-a-uuid', {
        type: 'param',
        metatype: String,
        data: 'id',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
