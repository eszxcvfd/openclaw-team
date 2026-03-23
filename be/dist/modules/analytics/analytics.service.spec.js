"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const analytics_service_1 = require("./analytics.service");
describe('AnalyticsService', () => {
    let service;
    let prisma;
    beforeEach(async () => {
        prisma = {
            users: {
                findUnique: jest.fn(),
            },
            analytics_snapshots: {
                findFirst: jest.fn(),
            },
            training_feedback: {
                findMany: jest.fn(),
            },
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                analytics_service_1.AnalyticsService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prisma,
                },
            ],
        }).compile();
        service = module.get(analytics_service_1.AnalyticsService);
    });
    it('should build department summary from manager-owned department scope', async () => {
        prisma.users.findUnique.mockResolvedValue({
            id: 'manager-1',
            department_id: 'dep-1',
            departments: {
                id: 'dep-1',
                name: 'Engineering',
            },
            user_agent_access: [
                {
                    is_allowed: true,
                    agent_groups: {
                        code: 'training_analytics_agent',
                    },
                },
            ],
            user_roles: [
                {
                    roles: {
                        code: 'department_manager',
                        name: 'Department Manager',
                    },
                },
            ],
        });
        prisma.analytics_snapshots.findFirst.mockResolvedValue({
            completion_rate: 82.5,
            snapshot_date: new Date('2026-03-01T00:00:00.000Z'),
        });
        prisma.training_feedback.findMany.mockResolvedValue([
            { sentiment_label: 'positive' },
            { sentiment_label: 'positive' },
            { sentiment_label: 'neutral' },
            { sentiment_label: 'negative' },
            { sentiment_label: null },
        ]);
        const result = await service.getDepartmentSummaryForManager('manager-1');
        expect(prisma.analytics_snapshots.findFirst).toHaveBeenCalledWith({
            where: {
                department_id: 'dep-1',
            },
            orderBy: [{ snapshot_date: 'desc' }, { created_at: 'desc' }],
            select: {
                completion_rate: true,
                snapshot_date: true,
            },
        });
        expect(prisma.training_feedback.findMany).toHaveBeenCalledWith({
            where: {
                users: {
                    department_id: 'dep-1',
                },
            },
            select: {
                sentiment_label: true,
            },
        });
        expect(result).toEqual(expect.objectContaining({
            departmentId: 'dep-1',
            departmentName: 'Engineering',
            periodLabel: '03/2026',
            completionRate: 82.5,
            sentimentBreakdown: {
                positive: 2,
                neutral: 2,
                negative: 1,
            },
            sentimentLabel: 'positive',
        }));
        expect(result.generatedAt).toEqual(expect.any(String));
    });
    it('should deny users without manager role', async () => {
        prisma.users.findUnique.mockResolvedValue({
            id: 'user-1',
            department_id: 'dep-1',
            departments: {
                id: 'dep-1',
                name: 'Engineering',
            },
            user_agent_access: [
                {
                    is_allowed: false,
                    agent_groups: {
                        code: 'training_analytics_agent',
                    },
                },
            ],
            user_roles: [
                {
                    roles: {
                        code: 'staff',
                        name: 'Staff',
                    },
                },
            ],
        });
        await expect(service.getDepartmentSummaryForManager('user-1')).rejects.toBeInstanceOf(common_1.ForbiddenException);
        expect(prisma.analytics_snapshots.findFirst).not.toHaveBeenCalled();
    });
    it('should fail gracefully when summary snapshot does not exist', async () => {
        prisma.users.findUnique.mockResolvedValue({
            id: 'manager-1',
            department_id: 'dep-1',
            departments: {
                id: 'dep-1',
                name: 'Engineering',
            },
            user_agent_access: [
                {
                    is_allowed: true,
                    agent_groups: {
                        code: 'training_analytics_agent',
                    },
                },
            ],
            user_roles: [
                {
                    roles: {
                        code: 'training_manager',
                        name: 'Training Manager',
                    },
                },
            ],
        });
        prisma.analytics_snapshots.findFirst.mockResolvedValue(null);
        prisma.training_feedback.findMany.mockResolvedValue([]);
        await expect(service.getDepartmentSummaryForManager('manager-1')).rejects.toBeInstanceOf(common_1.NotFoundException);
    });
    it('should aggregate unknown sentiment labels into neutral bucket', () => {
        const result = service.aggregateSentimentBreakdown([
            { sentiment_label: 'positive' },
            { sentiment_label: 'NEGATIVE' },
            { sentiment_label: 'unknown' },
            { sentiment_label: null },
        ]);
        expect(result).toEqual({
            positive: 1,
            neutral: 2,
            negative: 1,
        });
    });
    it('should deny manager users without analytics agent access', async () => {
        prisma.users.findUnique.mockResolvedValue({
            id: 'manager-1',
            department_id: 'dep-1',
            departments: {
                id: 'dep-1',
                name: 'Engineering',
            },
            user_agent_access: [],
            user_roles: [
                {
                    roles: {
                        code: 'department_manager',
                        name: 'Department Manager',
                    },
                },
            ],
        });
        await expect(service.getDepartmentSummaryForManager('manager-1')).rejects.toBeInstanceOf(common_1.ForbiddenException);
        expect(prisma.analytics_snapshots.findFirst).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=analytics.service.spec.js.map