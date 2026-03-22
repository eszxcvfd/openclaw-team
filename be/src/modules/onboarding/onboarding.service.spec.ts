import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: {
    faq_items: { findMany: jest.Mock };
    contacts_directory: { findMany: jest.Mock };
    user_onboarding_tasks: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      faq_items: {
        findMany: jest.fn(),
      },
      contacts_directory: {
        findMany: jest.fn(),
      },
      user_onboarding_tasks: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  describe('getFaqItems', () => {
    it('should return only the safe faq fields in camelCase order', async () => {
      prisma.faq_items.findMany.mockResolvedValue([
        {
          id: 'faq-1',
          category: 'policy',
          audience: 'all',
          question: 'Where is the handbook?',
          answer: 'See the portal.',
        },
      ]);

      await expect(service.getFaqItems()).resolves.toEqual([
        {
          id: 'faq-1',
          category: 'policy',
          audience: 'all',
          question: 'Where is the handbook?',
          answer: 'See the portal.',
        },
      ]);

      expect(prisma.faq_items.findMany).toHaveBeenCalledWith({
        where: {
          is_active: true,
        },
        select: {
          id: true,
          category: true,
          audience: true,
          question: true,
          answer: true,
        },
        orderBy: [{ category: 'asc' }, { question: 'asc' }],
      });
    });
  });

  describe('getSupportContacts', () => {
    it('should return active support contacts with flattened department names', async () => {
      prisma.contacts_directory.findMany.mockResolvedValue([
        {
          id: 'contact-1',
          name: 'IT Helpdesk',
          role_title: 'Support Engineer',
          email: 'it@example.com',
          phone: '123456789',
          support_type: 'it',
          departments: {
            name: 'Technology',
          },
        },
      ]);

      await expect(service.getSupportContacts()).resolves.toEqual([
        {
          id: 'contact-1',
          name: 'IT Helpdesk',
          departmentName: 'Technology',
          roleTitle: 'Support Engineer',
          email: 'it@example.com',
          phone: '123456789',
          supportType: 'it',
        },
      ]);

      expect(prisma.contacts_directory.findMany).toHaveBeenCalledWith({
        where: {
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          role_title: true,
          email: true,
          phone: true,
          support_type: true,
          departments: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ support_type: 'asc' }, { name: 'asc' }],
      });
    });

    it('should return null department names when the contact has no department', async () => {
      prisma.contacts_directory.findMany.mockResolvedValue([
        {
          id: 'contact-2',
          name: 'People Ops',
          role_title: null,
          email: 'hr@example.com',
          phone: null,
          support_type: 'hr',
          departments: null,
        },
      ]);

      await expect(service.getSupportContacts()).resolves.toEqual([
        {
          id: 'contact-2',
          name: 'People Ops',
          departmentName: null,
          roleTitle: null,
          email: 'hr@example.com',
          phone: null,
          supportType: 'hr',
        },
      ]);
    });
  });

  describe('getChecklistItems', () => {
    it('should return only pending tasks for the token user in deterministic order', async () => {
      prisma.user_onboarding_tasks.findMany.mockResolvedValue([
        {
          status: 'pending',
          onboarding_tasks: {
            id: 'task-1',
            task_name: 'Read the handbook',
            description: 'Review company onboarding guide.',
            due_day: 1,
            required: true,
            order_no: 1,
          },
        },
      ]);

      await expect(service.getChecklistItems('user-1')).resolves.toEqual([
        {
          taskId: 'task-1',
          taskName: 'Read the handbook',
          description: 'Review company onboarding guide.',
          status: 'pending',
          dueDay: 1,
          required: true,
          orderNo: 1,
        },
      ]);

      expect(prisma.user_onboarding_tasks.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user-1',
          status: 'pending',
        },
        select: {
          status: true,
          onboarding_tasks: {
            select: {
              id: true,
              task_name: true,
              description: true,
              due_day: true,
              required: true,
              order_no: true,
            },
          },
        },
        orderBy: [
          { onboarding_tasks: { order_no: 'asc' } },
          { onboarding_tasks: { task_name: 'asc' } },
        ],
      });
    });
  });

  describe('completeChecklistTask', () => {
    it('should complete a pending checklist task for the token user', async () => {
      prisma.user_onboarding_tasks.findUnique.mockResolvedValue({
        id: 'user-task-1',
        user_id: 'user-1',
        onboarding_task_id: 'task-1',
        status: 'pending',
        completed_at: null,
      });
      prisma.user_onboarding_tasks.update.mockResolvedValue({
        onboarding_task_id: 'task-1',
        status: 'completed',
        completed_at: new Date('2026-03-21T14:30:00.000Z'),
      });

      await expect(
        service.completeChecklistTask('user-1', 'task-1', 'Done with HR'),
      ).resolves.toEqual({
        taskId: 'task-1',
        status: 'completed',
        completedAt: '2026-03-21T14:30:00.000Z',
      });

      expect(prisma.user_onboarding_tasks.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_onboarding_task_id: {
            user_id: 'user-1',
            onboarding_task_id: 'task-1',
          },
        },
        select: {
          id: true,
          user_id: true,
          onboarding_task_id: true,
          status: true,
          completed_at: true,
        },
      });
      expect(prisma.user_onboarding_tasks.update).toHaveBeenCalledWith({
        where: {
          user_id_onboarding_task_id: {
            user_id: 'user-1',
            onboarding_task_id: 'task-1',
          },
        },
        data: {
          status: 'completed',
          completed_at: expect.any(Date),
          notes: 'Done with HR',
        },
        select: {
          onboarding_task_id: true,
          status: true,
          completed_at: true,
        },
      });
    });

    it('should return the existing completion state without resetting completedAt', async () => {
      prisma.user_onboarding_tasks.findUnique.mockResolvedValue({
        id: 'user-task-1',
        user_id: 'user-1',
        onboarding_task_id: 'task-1',
        status: 'completed',
        completed_at: new Date('2026-03-21T14:30:00.000Z'),
      });

      await expect(service.completeChecklistTask('user-1', 'task-1')).resolves.toEqual({
        taskId: 'task-1',
        status: 'completed',
        completedAt: '2026-03-21T14:30:00.000Z',
      });

      expect(prisma.user_onboarding_tasks.update).not.toHaveBeenCalled();
    });

    it('should throw a not found error when the task is not assigned to the token user', async () => {
      prisma.user_onboarding_tasks.findUnique.mockResolvedValue(null);

      await expect(
        service.completeChecklistTask('user-1', 'task-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.user_onboarding_tasks.update).not.toHaveBeenCalled();
    });
  });
});
