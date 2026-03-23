import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { toDbAgentGroupCode } from '../agent-router/agent-registry';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllWithRolesAndAccess() {
    return this.prisma.users.findMany({
      include: {
        user_roles: {
          include: {
            roles: true,
          },
        },
        user_agent_access: {
          include: {
            agent_groups: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateAgentAccess(userId: string, agentGroupCode: string, isAllowed: boolean) {
    const normalizedAgentGroupCode = toDbAgentGroupCode(agentGroupCode);

    if (!normalizedAgentGroupCode) {
      throw new NotFoundException(`Agent group with code ${agentGroupCode} not found`);
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const agentGroup = await this.prisma.agent_groups.findUnique({
      where: { code: normalizedAgentGroupCode },
    });
    if (!agentGroup) {
      throw new NotFoundException(`Agent group with code ${agentGroupCode} not found`);
    }

    return this.prisma.user_agent_access.upsert({
      where: {
        user_id_agent_group_id: {
          user_id: user.id,
          agent_group_id: agentGroup.id,
        },
      },
      update: {
        is_allowed: isAllowed,
      },
      create: {
        user_id: user.id,
        agent_group_id: agentGroup.id,
        is_allowed: isAllowed,
      },
    });
  }
}
