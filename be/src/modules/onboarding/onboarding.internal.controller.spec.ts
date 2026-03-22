import { BadRequestException, ParseUUIDPipe, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';

import { AGENT_SCOPE_KEY } from '../auth/decorators/agent-scope.decorator';
import { InternalAgentGuard } from '../auth/guards/internal-agent.guard';
import { OnboardingInternalController } from './onboarding.internal.controller';
import { OnboardingService } from './onboarding.service';

describe('OnboardingInternalController', () => {
  let controller: OnboardingInternalController;
  let service: {
    getFaqItems: jest.Mock;
    getSupportContacts: jest.Mock;
    getChecklistItems: jest.Mock;
    completeChecklistTask: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getFaqItems: jest.fn(),
      getSupportContacts: jest.fn(),
      getChecklistItems: jest.fn(),
      completeChecklistTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingInternalController],
      providers: [
        {
          provide: OnboardingService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(InternalAgentGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OnboardingInternalController>(OnboardingInternalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFaq', () => {
    it('should delegate to onboarding service', async () => {
      const mockResult = [
        {
          id: 'faq-1',
          category: 'policy',
          audience: 'all',
          question: 'How do I request equipment?',
          answer: 'Open a ticket.',
        },
      ];
      service.getFaqItems.mockResolvedValue(mockResult);

      await expect(controller.getFaq()).resolves.toEqual(mockResult);
      expect(service.getFaqItems).toHaveBeenCalledTimes(1);
    });

    it('should expose a guarded GET /faq route with onboarding scope', () => {
      expect(
        Reflect.getMetadata(PATH_METADATA, OnboardingInternalController),
      ).toBe('internal/tools/onboarding');
      expect(
        Reflect.getMetadata(PATH_METADATA, OnboardingInternalController.prototype.getFaq),
      ).toBe('faq');
      expect(
        Reflect.getMetadata(METHOD_METADATA, OnboardingInternalController.prototype.getFaq),
      ).toBe(RequestMethod.GET);
      expect(
        Reflect.getMetadata(GUARDS_METADATA, OnboardingInternalController.prototype.getFaq),
      ).toContain(InternalAgentGuard);
      expect(
        Reflect.getMetadata(AGENT_SCOPE_KEY, OnboardingInternalController.prototype.getFaq),
      ).toEqual(['read:onboarding']);
    });
  });

  describe('getSupportContacts', () => {
    it('should delegate to onboarding service', async () => {
      const mockResult = [
        {
          id: 'contact-1',
          name: 'IT Helpdesk',
          departmentName: 'Technology',
          roleTitle: 'Support Engineer',
          email: 'it@example.com',
          phone: '123456789',
          supportType: 'it',
        },
      ];
      service.getSupportContacts.mockResolvedValue(mockResult);

      await expect(controller.getSupportContacts()).resolves.toEqual(mockResult);
      expect(service.getSupportContacts).toHaveBeenCalledTimes(1);
    });

    it('should expose a guarded GET /contacts/support route with onboarding scope', () => {
      expect(
        Reflect.getMetadata(
          PATH_METADATA,
          OnboardingInternalController.prototype.getSupportContacts,
        ),
      ).toBe('contacts/support');
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          OnboardingInternalController.prototype.getSupportContacts,
        ),
      ).toBe(RequestMethod.GET);
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          OnboardingInternalController.prototype.getSupportContacts,
        ),
      ).toContain(InternalAgentGuard);
      expect(
        Reflect.getMetadata(
          AGENT_SCOPE_KEY,
          OnboardingInternalController.prototype.getSupportContacts,
        ),
      ).toEqual(['read:onboarding']);
    });
  });

  describe('getChecklist', () => {
    it('should delegate to onboarding service with the token user id', async () => {
      const mockResult = [
        {
          taskId: 'task-1',
          taskName: 'Read the handbook',
          description: 'Review company onboarding guide.',
          status: 'pending',
          dueDay: 1,
          required: true,
          orderNo: 1,
        },
      ];
      service.getChecklistItems.mockResolvedValue(mockResult);

      await expect(
        controller.getChecklist({ internalAgent: { userId: 'user-1' } } as never),
      ).resolves.toEqual(mockResult);
      expect(service.getChecklistItems).toHaveBeenCalledWith('user-1');
    });

    it('should expose a guarded GET /me/checklist route with checklist read scope', () => {
      expect(
        Reflect.getMetadata(PATH_METADATA, OnboardingInternalController.prototype.getChecklist),
      ).toBe('me/checklist');
      expect(
        Reflect.getMetadata(METHOD_METADATA, OnboardingInternalController.prototype.getChecklist),
      ).toBe(RequestMethod.GET);
      expect(
        Reflect.getMetadata(GUARDS_METADATA, OnboardingInternalController.prototype.getChecklist),
      ).toContain(InternalAgentGuard);
      expect(
        Reflect.getMetadata(AGENT_SCOPE_KEY, OnboardingInternalController.prototype.getChecklist),
      ).toEqual(['read:checklist']);
    });
  });

  describe('completeChecklistTask', () => {
    it('should delegate to onboarding service with token user id, task id, and note', async () => {
      const mockResult = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        completedAt: '2026-03-21T14:30:00.000Z',
      };
      service.completeChecklistTask.mockResolvedValue(mockResult);

      await expect(
        controller.completeChecklistTask(
          { internalAgent: { userId: 'user-1' } } as never,
          '550e8400-e29b-41d4-a716-446655440000',
          { note: 'Done with HR' },
        ),
      ).resolves.toEqual(mockResult);
      expect(service.completeChecklistTask).toHaveBeenCalledWith(
        'user-1',
        '550e8400-e29b-41d4-a716-446655440000',
        'Done with HR',
      );
    });

    it('should expose a guarded POST /me/checklist/:taskId/complete route with checklist write scope', () => {
      expect(
        Reflect.getMetadata(
          PATH_METADATA,
          OnboardingInternalController.prototype.completeChecklistTask,
        ),
      ).toBe('me/checklist/:taskId/complete');
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          OnboardingInternalController.prototype.completeChecklistTask,
        ),
      ).toBe(RequestMethod.POST);
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          OnboardingInternalController.prototype.completeChecklistTask,
        ),
      ).toContain(InternalAgentGuard);
      expect(
        Reflect.getMetadata(
          AGENT_SCOPE_KEY,
          OnboardingInternalController.prototype.completeChecklistTask,
        ),
      ).toEqual(['write:checklist']);
    });

    it('should validate taskId with ParseUUIDPipe metadata', async () => {
      const pipe = new ParseUUIDPipe();

      await expect(
        pipe.transform('not-a-uuid', {
          type: 'param',
          metatype: String,
          data: 'taskId',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
