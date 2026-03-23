import { RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';

import { AGENT_SCOPE_KEY } from '../auth/decorators/agent-scope.decorator';
import { InternalAgentGuard } from '../auth/guards/internal-agent.guard';
import { TrainingInternalController } from './training.internal.controller';
import { TrainingService } from './training.service';

describe('TrainingInternalController', () => {
  let controller: TrainingInternalController;
  let service: {
    generateQuizForUser: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      generateQuizForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingInternalController],
      providers: [
        {
          provide: TrainingService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(InternalAgentGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TrainingInternalController>(TrainingInternalController);
  });

  it('should delegate quiz generation to training service with the token user id', async () => {
    const payload = {
      type: 'quiz' as const,
      version: 1 as const,
      quizId: '550e8400-e29b-41d4-a716-446655440010',
      templateCode: 'nodejs-basics',
      title: 'NodeJS Basics',
      difficulty: 'easy',
      course: null,
      questionCount: 1,
      questions: [],
    };
    service.generateQuizForUser.mockResolvedValue(payload);

    await expect(
      controller.generateQuiz(
        { internalAgent: { userId: 'user-1' } } as never,
        { difficulty: 'easy' },
      ),
    ).resolves.toEqual(payload);
    expect(service.generateQuizForUser).toHaveBeenCalledWith('user-1', {
      difficulty: 'easy',
    });
  });

  it('should expose a guarded POST /quiz/generate route with training write scope', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TrainingInternalController)).toBe(
      'internal/tools/training',
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TrainingInternalController.prototype.generateQuiz,
      ),
    ).toBe('quiz/generate');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TrainingInternalController.prototype.generateQuiz,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        TrainingInternalController.prototype.generateQuiz,
      ),
    ).toContain(InternalAgentGuard);
    expect(
      Reflect.getMetadata(
        AGENT_SCOPE_KEY,
        TrainingInternalController.prototype.generateQuiz,
      ),
    ).toEqual(['write:training']);
  });
});
