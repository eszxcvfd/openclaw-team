import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service';

export interface OnboardingFaqItem {
  id: string;
  category: string;
  audience: string;
  question: string;
  answer: string;
}

export interface SupportContact {
  id: string;
  name: string;
  departmentName: string | null;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  supportType: string | null;
}

export interface ChecklistItem {
  taskId: string;
  taskName: string;
  description: string | null;
  status: string;
  dueDay: number;
  required: boolean;
  orderNo: number;
}

export interface CompletedChecklistTask {
  taskId: string;
  status: string;
  completedAt: string | null;
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getFaqItems(): Promise<OnboardingFaqItem[]> {
    const faqItems = await this.prisma.faq_items.findMany({
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

    return faqItems.map((faqItem) => ({
      id: faqItem.id,
      category: faqItem.category,
      audience: faqItem.audience,
      question: faqItem.question,
      answer: faqItem.answer,
    }));
  }

  async getSupportContacts(): Promise<SupportContact[]> {
    const contacts = await this.prisma.contacts_directory.findMany({
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

    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      departmentName: contact.departments?.name ?? null,
      roleTitle: contact.role_title,
      email: contact.email,
      phone: contact.phone,
      supportType: contact.support_type,
    }));
  }

  async getChecklistItems(userId: string): Promise<ChecklistItem[]> {
    const checklistItems = await this.prisma.user_onboarding_tasks.findMany({
      where: {
        user_id: userId,
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

    return checklistItems.map((item) => ({
      taskId: item.onboarding_tasks.id,
      taskName: item.onboarding_tasks.task_name,
      description: item.onboarding_tasks.description,
      status: item.status,
      dueDay: item.onboarding_tasks.due_day,
      required: item.onboarding_tasks.required,
      orderNo: item.onboarding_tasks.order_no,
    }));
  }

  async completeChecklistTask(
    userId: string,
    taskId: string,
    note?: string,
  ): Promise<CompletedChecklistTask> {
    const existingAssignment = await this.prisma.user_onboarding_tasks.findUnique({
      where: {
        user_id_onboarding_task_id: {
          user_id: userId,
          onboarding_task_id: taskId,
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

    if (!existingAssignment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Checklist task not found.',
        details: {},
      });
    }

    if (existingAssignment.status === 'completed') {
      return {
        taskId: existingAssignment.onboarding_task_id,
        status: existingAssignment.status,
        completedAt: existingAssignment.completed_at?.toISOString() ?? null,
      };
    }

    const completedAt = new Date();
    const updatedAssignment = await this.prisma.user_onboarding_tasks.update({
      where: {
        user_id_onboarding_task_id: {
          user_id: userId,
          onboarding_task_id: taskId,
        },
      },
      data: {
        status: 'completed',
        completed_at: completedAt,
        notes: note,
      },
      select: {
        onboarding_task_id: true,
        status: true,
        completed_at: true,
      },
    });

    return {
      taskId: updatedAssignment.onboarding_task_id,
      status: updatedAssignment.status,
      completedAt: updatedAssignment.completed_at?.toISOString() ?? null,
    };
  }
}
