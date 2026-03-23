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
    getTrainingRecommendationsForUser: jest.Mock;
    getLearningPathForUser: jest.Mock;
    generateLearningPathForUser: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      generateQuizForUser: jest.fn(),
      getTrainingRecommendationsForUser: jest.fn(),
      getLearningPathForUser: jest.fn(),
      generateLearningPathForUser: jest.fn(),
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

  it('should expose a guarded GET /me/training-recommendations route with training read scope', async () => {
    const payload = [{ courseId: 'course-1', title: 'Node.js Intermediate', reason: 'Gap', priority: 1 }];
    service.getTrainingRecommendationsForUser.mockResolvedValue(payload);

    await expect(
      controller.getTrainingRecommendations({ internalAgent: { userId: 'user-1' } } as never),
    ).resolves.toEqual(payload);

    expect(service.getTrainingRecommendationsForUser).toHaveBeenCalledWith('user-1');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TrainingInternalController.prototype.getTrainingRecommendations,
      ),
    ).toBe('me/training-recommendations');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TrainingInternalController.prototype.getTrainingRecommendations,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        AGENT_SCOPE_KEY,
        TrainingInternalController.prototype.getTrainingRecommendations,
      ),
    ).toEqual(['read:training']);
  });

  it('should expose a guarded GET /me/learning-path route with training read scope', async () => {
    const payload = { id: 'path-1', name: 'Backend Path', generated: true, items: [] };
    service.getLearningPathForUser.mockResolvedValue(payload);

    await expect(
      controller.getLearningPath({ internalAgent: { userId: 'user-1' } } as never),
    ).resolves.toEqual(payload);

    expect(service.getLearningPathForUser).toHaveBeenCalledWith('user-1');
    expect(
      Reflect.getMetadata(PATH_METADATA, TrainingInternalController.prototype.getLearningPath),
    ).toBe('me/learning-path');
    expect(
      Reflect.getMetadata(METHOD_METADATA, TrainingInternalController.prototype.getLearningPath),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(AGENT_SCOPE_KEY, TrainingInternalController.prototype.getLearningPath),
    ).toEqual(['read:training']);
  });

  it('should expose a guarded POST /me/learning-path/generate route with training write scope', async () => {
    const payload = { id: 'path-1', name: 'Backend Path', generated: true, items: [] };
    service.generateLearningPathForUser.mockResolvedValue(payload);

    await expect(
      controller.generateLearningPath(
        { internalAgent: { userId: 'user-1' } } as never,
        { targetLevel: 'intern' },
      ),
    ).resolves.toEqual(payload);

    expect(service.generateLearningPathForUser).toHaveBeenCalledWith('user-1', {
      targetLevel: 'intern',
    });
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TrainingInternalController.prototype.generateLearningPath,
      ),
    ).toBe('me/learning-path/generate');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        TrainingInternalController.prototype.generateLearningPath,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        AGENT_SCOPE_KEY,
        TrainingInternalController.prototype.generateLearningPath,
      ),
    ).toEqual(['write:training']);
  });
});
