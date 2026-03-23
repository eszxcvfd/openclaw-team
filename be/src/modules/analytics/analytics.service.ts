import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { toDbAgentGroupCode } from '../agent-router/agent-registry';

export interface DepartmentAnalyticsSummaryDto {
  departmentId: string;
  departmentName: string;
  periodLabel: string;
  completionRate: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  sentimentLabel?: string;
  generatedAt?: string;
}

interface ManagerProfile {
  id: string;
  department_id: string | null;
  departments: {
    id: string;
    name: string;
  } | null;
  user_agent_access: Array<{
    is_allowed: boolean;
    agent_groups: {
      code: string;
    };
  }>;
  user_roles: Array<{
    roles: {
      code: string;
      name: string;
    };
  }>;
}

interface CompletionSnapshotRecord {
  completion_rate: unknown;
  snapshot_date: Date;
}

interface FeedbackRecord {
  sentiment_label: string | null;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepartmentSummaryForManager(
    managerUserId: string,
  ): Promise<DepartmentAnalyticsSummaryDto> {
    const manager = await this.getManagerProfile(managerUserId);
    const roleCodes = manager.user_roles.map((entry) => entry.roles.code.toLowerCase());
    const allowedAgentCodes = manager.user_agent_access
      .filter((entry) => entry.is_allowed)
      .map((entry) => toDbAgentGroupCode(entry.agent_groups.code))
      .filter((entry): entry is 'training_analytics' | 'onboarding' | 'learning_training' => Boolean(entry));

    const isManager = roleCodes.some((code) => code.includes('manager') || code.includes('hr'));
    const hasAnalyticsAgentAccess = allowedAgentCodes.includes('training_analytics');

    if (!isManager || !hasAnalyticsAgentAccess) {
      throw new ForbiddenException({
        code: 'AGENT_ACCESS_DENIED',
        message: 'User does not have permission to access department analytics summary.',
        details: {},
      });
    }

    const departmentId = manager.department_id;
    const departmentName = manager.departments?.name;

    if (!departmentId || !departmentName) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Manager department scope is missing.',
        details: {},
      });
    }

    const [latestSnapshot, feedbackRows] = await Promise.all([
      this.prisma.analytics_snapshots.findFirst({
        where: {
          department_id: departmentId,
        },
        orderBy: [{ snapshot_date: 'desc' }, { created_at: 'desc' }],
        select: {
          completion_rate: true,
          snapshot_date: true,
        },
      }) as Promise<CompletionSnapshotRecord | null>,
      this.prisma.training_feedback.findMany({
        where: {
          users: {
            department_id: departmentId,
          },
        },
        select: {
          sentiment_label: true,
        },
      }) as Promise<FeedbackRecord[]>,
    ]);

    if (!latestSnapshot) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Department analytics summary not found.',
        details: {},
      });
    }

    const sentimentBreakdown = this.aggregateSentimentBreakdown(feedbackRows);

    return {
      departmentId,
      departmentName,
      periodLabel: this.formatPeriodLabel(latestSnapshot.snapshot_date),
      completionRate: this.toNumber(latestSnapshot.completion_rate),
      sentimentBreakdown,
      sentimentLabel: this.resolveSentimentLabel(sentimentBreakdown),
      generatedAt: new Date().toISOString(),
    };
  }

  aggregateSentimentBreakdown(feedbackRows: Array<{ sentiment_label: string | null }>) {
    return feedbackRows.reduce(
      (acc, row) => {
        const label = (row.sentiment_label ?? '').trim().toLowerCase();

        if (label === 'positive') {
          acc.positive += 1;
        } else if (label === 'negative') {
          acc.negative += 1;
        } else {
          acc.neutral += 1;
        }

        return acc;
      },
      {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
    );
  }

  private async getManagerProfile(managerUserId: string) {
    const manager = (await this.prisma.users.findUnique({
      where: {
        id: managerUserId,
      },
      select: {
        id: true,
        department_id: true,
        departments: {
          select: {
            id: true,
            name: true,
          },
        },
        user_agent_access: {
          select: {
            is_allowed: true,
            agent_groups: {
              select: {
                code: true,
              },
            },
          },
        },
        user_roles: {
          include: {
            roles: {
              select: {
                code: true,
                name: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    })) as ManagerProfile | null;

    if (!manager) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Manager not found.',
        details: {},
      });
    }

    return manager;
  }

  private resolveSentimentLabel(sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  }) {
    const entries: Array<{ label: 'positive' | 'neutral' | 'negative'; value: number }> = [
      { label: 'positive', value: sentimentBreakdown.positive },
      { label: 'neutral', value: sentimentBreakdown.neutral },
      { label: 'negative', value: sentimentBreakdown.negative },
    ];

    entries.sort((left, right) => right.value - left.value);

    return entries[0]?.value > 0 ? entries[0].label : undefined;
  }

  private formatPeriodLabel(snapshotDate: Date) {
    if (!(snapshotDate instanceof Date) || Number.isNaN(snapshotDate.getTime())) {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Invalid analytics snapshot date.',
        details: {},
      });
    }

    const month = String(snapshotDate.getUTCMonth() + 1).padStart(2, '0');
    const year = String(snapshotDate.getUTCFullYear());

    return `${month}/${year}`;
  }

  private toNumber(value: unknown) {
    const normalized = Number(String(value));
    return Number.isFinite(normalized) ? normalized : 0;
  }
}
