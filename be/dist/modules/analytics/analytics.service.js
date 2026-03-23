"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDepartmentSummaryForManager(managerUserId) {
        const manager = await this.getManagerProfile(managerUserId);
        const roleCodes = manager.user_roles.map((entry) => entry.roles.code.toLowerCase());
        const allowedAgentCodes = manager.user_agent_access
            .filter((entry) => entry.is_allowed)
            .map((entry) => entry.agent_groups.code.toLowerCase());
        const isManager = roleCodes.some((code) => code.includes('manager') || code.includes('hr'));
        const hasAnalyticsAgentAccess = allowedAgentCodes.includes('training_analytics_agent');
        if (!isManager || !hasAnalyticsAgentAccess) {
            throw new common_1.ForbiddenException({
                code: 'AGENT_ACCESS_DENIED',
                message: 'User does not have permission to access department analytics summary.',
                details: {},
            });
        }
        const departmentId = manager.department_id;
        const departmentName = manager.departments?.name;
        if (!departmentId || !departmentName) {
            throw new common_1.ForbiddenException({
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
            }),
            this.prisma.training_feedback.findMany({
                where: {
                    users: {
                        department_id: departmentId,
                    },
                },
                select: {
                    sentiment_label: true,
                },
            }),
        ]);
        if (!latestSnapshot) {
            throw new common_1.NotFoundException({
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
    aggregateSentimentBreakdown(feedbackRows) {
        return feedbackRows.reduce((acc, row) => {
            const label = (row.sentiment_label ?? '').trim().toLowerCase();
            if (label === 'positive') {
                acc.positive += 1;
            }
            else if (label === 'negative') {
                acc.negative += 1;
            }
            else {
                acc.neutral += 1;
            }
            return acc;
        }, {
            positive: 0,
            neutral: 0,
            negative: 0,
        });
    }
    async getManagerProfile(managerUserId) {
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
        }));
        if (!manager) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'Manager not found.',
                details: {},
            });
        }
        return manager;
    }
    resolveSentimentLabel(sentimentBreakdown) {
        const entries = [
            { label: 'positive', value: sentimentBreakdown.positive },
            { label: 'neutral', value: sentimentBreakdown.neutral },
            { label: 'negative', value: sentimentBreakdown.negative },
        ];
        entries.sort((left, right) => right.value - left.value);
        return entries[0]?.value > 0 ? entries[0].label : undefined;
    }
    formatPeriodLabel(snapshotDate) {
        if (!(snapshotDate instanceof Date) || Number.isNaN(snapshotDate.getTime())) {
            throw new common_1.InternalServerErrorException({
                code: 'INTERNAL_ERROR',
                message: 'Invalid analytics snapshot date.',
                details: {},
            });
        }
        const month = String(snapshotDate.getUTCMonth() + 1).padStart(2, '0');
        const year = String(snapshotDate.getUTCFullYear());
        return `${month}/${year}`;
    }
    toNumber(value) {
        const normalized = Number(String(value));
        return Number.isFinite(normalized) ? normalized : 0;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map