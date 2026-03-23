"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const agent_router_service_1 = require("./agent-router.service");
describe('AgentRouterService', () => {
    let service;
    let prismaService;
    beforeEach(async () => {
        prismaService = {
            users: {
                findUnique: jest.fn(),
            },
        };
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [
                agent_router_service_1.AgentRouterService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prismaService,
                },
            ],
        }).compile();
        service = moduleRef.get(agent_router_service_1.AgentRouterService);
    });
    it('routes onboarding questions to onboarding assistant', async () => {
        prismaService.users.findUnique.mockResolvedValue({
            user_roles: [{ roles: { code: 'employee' } }],
            user_agent_access: [],
        });
        const result = await service.routeMessage({
            userId: 'user-1',
            message: 'Toi can xem checklist onboarding ngay dau tien',
        });
        expect(result.agentGroup).toBe('onboarding_assistant');
        expect(result.classificationSource).toBe('rule');
        expect(result.allowedResources.scopes).toContain('read:checklist');
    });
    it('does not route analytics for users without analytics access', async () => {
        prismaService.users.findUnique.mockResolvedValue({
            user_roles: [{ roles: { code: 'employee' } }],
            user_agent_access: [],
        });
        const result = await service.routeMessage({
            userId: 'user-2',
            message: 'Cho toi bao cao analytics phong ban',
        });
        expect(result.agentGroup).not.toBe('training_analytics_agent');
        expect(result.allowedAgentGroups).toEqual([
            'onboarding_assistant',
            'learning_training_agent',
        ]);
    });
    it('keeps current agent group for ambiguous follow-up messages', async () => {
        prismaService.users.findUnique.mockResolvedValue({
            user_roles: [{ roles: { code: 'employee' } }],
            user_agent_access: [],
        });
        const result = await service.routeMessage({
            userId: 'user-3',
            message: 'lam tiep giup toi',
            currentAgentGroup: 'learning_training_agent',
        });
        expect(result.agentGroup).toBe('learning_training_agent');
        expect(result.classificationSource).toBe('sticky');
    });
});
//# sourceMappingURL=agent-router.service.spec.js.map