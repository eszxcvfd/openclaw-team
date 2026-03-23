import { Test } from '@nestjs/testing';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { AgentRouterService } from './agent-router.service';

describe('AgentRouterService', () => {
  let service: AgentRouterService;
  let prismaService: {
    users: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      users: {
        findUnique: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AgentRouterService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = moduleRef.get(AgentRouterService);
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
