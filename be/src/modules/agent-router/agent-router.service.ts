import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  AgentRuntimeCode,
  DEFAULT_AGENT_ORDER,
  getAgentRegistryEntry,
  getRuntimeAgentCodesFromDbCodes,
  toRuntimeAgentCode,
} from './agent-registry';

export type AgentGroupCode = AgentRuntimeCode;

export interface AgentAllowedResources {
  documents: string[];
  tools: string[];
  scopes: string[];
}

export interface AgentRouteDecision {
  agentGroup: AgentGroupCode;
  allowedResources: AgentAllowedResources;
  allowedAgentGroups: AgentGroupCode[];
  classificationSource: 'rule' | 'google' | 'sticky' | 'default';
}

type UserAccessProfile = {
  user_roles: Array<{
    roles: {
      code: string;
    };
  }>;
  user_agent_access: Array<{
    is_allowed: boolean;
    agent_groups: {
      code: string;
      is_active: boolean;
    };
  }>;
};

@Injectable()
export class AgentRouterService {
  constructor(private readonly prisma: PrismaService) {}

  async routeMessage(params: {
    userId: string;
    message: string;
    currentAgentGroup?: string | null;
  }): Promise<AgentRouteDecision> {
    const accessProfile = await this.prisma.users.findUnique({
      where: {
        id: params.userId,
      },
      select: {
        user_roles: {
          select: {
            roles: {
              select: {
                code: true,
              },
            },
          },
        },
        user_agent_access: {
          select: {
            is_allowed: true,
            agent_groups: {
              select: {
                code: true,
                is_active: true,
              },
            },
          },
        },
      },
    }) as UserAccessProfile | null;

    const allowedAgentGroups = this.resolveAllowedAgentGroups(accessProfile);
    const stickyAgentGroup = this.normalizeAgentGroupCode(params.currentAgentGroup);

    const ruleMatched = this.resolveRuleMatch(params.message, allowedAgentGroups);
    if (ruleMatched) {
      return this.buildDecision(ruleMatched, allowedAgentGroups, 'rule');
    }

    if (stickyAgentGroup && allowedAgentGroups.includes(stickyAgentGroup)) {
      return this.buildDecision(stickyAgentGroup, allowedAgentGroups, 'sticky');
    }

    const googleMatched = await this.resolveGoogleMatch(params.message, allowedAgentGroups);
    if (googleMatched) {
      return this.buildDecision(googleMatched, allowedAgentGroups, 'google');
    }

    return this.buildDecision(allowedAgentGroups[0] ?? 'learning_training_agent', allowedAgentGroups, 'default');
  }

  private buildDecision(
    agentGroup: AgentGroupCode,
    allowedAgentGroups: AgentGroupCode[],
    classificationSource: AgentRouteDecision['classificationSource'],
  ): AgentRouteDecision {
    const profile = getAgentRegistryEntry(agentGroup).profile;

    return {
      agentGroup,
      allowedAgentGroups,
      classificationSource,
      allowedResources: {
        documents: [],
        tools: profile.tools,
        scopes: profile.scopes,
      },
    };
  }

  private resolveAllowedAgentGroups(accessProfile: UserAccessProfile | null): AgentGroupCode[] {
    const explicitAllowed = accessProfile?.user_agent_access
      .filter((entry) => entry.is_allowed && entry.agent_groups.is_active)
      .map((entry) => entry.agent_groups.code);

    const explicitAllowedAgentGroups = getRuntimeAgentCodesFromDbCodes(explicitAllowed ?? []);

    if (explicitAllowedAgentGroups.length > 0) {
      return explicitAllowedAgentGroups;
    }

    const roleCodes = accessProfile?.user_roles.map((entry) => entry.roles.code.toLowerCase()) ?? [];
    const isManagerLike = roleCodes.some((roleCode) =>
      /(manager|lead|supervisor|hr|admin)/i.test(roleCode),
    );

    return isManagerLike
      ? DEFAULT_AGENT_ORDER
      : DEFAULT_AGENT_ORDER.filter((entry) => entry !== 'training_analytics_agent');
  }

  private resolveRuleMatch(
    message: string,
    allowedAgentGroups: AgentGroupCode[],
  ): AgentGroupCode | null {
    for (const agentGroup of DEFAULT_AGENT_ORDER) {
      if (!allowedAgentGroups.includes(agentGroup)) {
        continue;
      }

      const matched = getAgentRegistryEntry(agentGroup).profile.keywords.some((pattern) =>
        pattern.test(message),
      );

      if (matched) {
        return agentGroup;
      }
    }

    return null;
  }

  private async resolveGoogleMatch(
    message: string,
    allowedAgentGroups: AgentGroupCode[],
  ): Promise<AgentGroupCode | null> {
    const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
    if (!apiKey || allowedAgentGroups.length <= 1) {
      return null;
    }

    const model = process.env.GEMINI_CLASSIFIER_MODEL?.trim() || 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'Classify the message into exactly one backend agent group.',
                  `Allowed agent groups: ${allowedAgentGroups.join(', ')}`,
                  'Return JSON only with shape: {"agentGroup":"...","confidence":"high|low"}.',
                  'If uncertain, use confidence low and pick the safest allowed match.',
                  `Message: ${message}`,
                ].join('\n'),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return null;
    }

    try {
      const normalized = JSON.parse(text) as {
        agentGroup?: string;
        confidence?: string;
      };
      const agentGroup = this.normalizeAgentGroupCode(normalized.agentGroup);
      const confidence = normalized.confidence?.trim().toLowerCase();

      if (!agentGroup || !allowedAgentGroups.includes(agentGroup) || confidence !== 'high') {
        return null;
      }

      return agentGroup;
    } catch {
      return null;
    }
  }

  private normalizeAgentGroupCode(value?: string | null): AgentGroupCode | null {
    return toRuntimeAgentCode(value);
  }
}
