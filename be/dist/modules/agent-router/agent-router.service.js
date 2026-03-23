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
exports.AgentRouterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const agent_registry_1 = require("./agent-registry");
let AgentRouterService = class AgentRouterService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async routeMessage(params) {
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
        });
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
    buildDecision(agentGroup, allowedAgentGroups, classificationSource) {
        const profile = (0, agent_registry_1.getAgentRegistryEntry)(agentGroup).profile;
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
    resolveAllowedAgentGroups(accessProfile) {
        const explicitAllowed = accessProfile?.user_agent_access
            .filter((entry) => entry.is_allowed && entry.agent_groups.is_active)
            .map((entry) => entry.agent_groups.code);
        const explicitAllowedAgentGroups = (0, agent_registry_1.getRuntimeAgentCodesFromDbCodes)(explicitAllowed ?? []);
        if (explicitAllowedAgentGroups.length > 0) {
            return explicitAllowedAgentGroups;
        }
        const roleCodes = accessProfile?.user_roles.map((entry) => entry.roles.code.toLowerCase()) ?? [];
        const isManagerLike = roleCodes.some((roleCode) => /(manager|lead|supervisor|hr|admin)/i.test(roleCode));
        return isManagerLike
            ? agent_registry_1.DEFAULT_AGENT_ORDER
            : agent_registry_1.DEFAULT_AGENT_ORDER.filter((entry) => entry !== 'training_analytics_agent');
    }
    resolveRuleMatch(message, allowedAgentGroups) {
        for (const agentGroup of agent_registry_1.DEFAULT_AGENT_ORDER) {
            if (!allowedAgentGroups.includes(agentGroup)) {
                continue;
            }
            const matched = (0, agent_registry_1.getAgentRegistryEntry)(agentGroup).profile.keywords.some((pattern) => pattern.test(message));
            if (matched) {
                return agentGroup;
            }
        }
        return null;
    }
    async resolveGoogleMatch(message, allowedAgentGroups) {
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
        const payload = (await response.json());
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) {
            return null;
        }
        try {
            const normalized = JSON.parse(text);
            const agentGroup = this.normalizeAgentGroupCode(normalized.agentGroup);
            const confidence = normalized.confidence?.trim().toLowerCase();
            if (!agentGroup || !allowedAgentGroups.includes(agentGroup) || confidence !== 'high') {
                return null;
            }
            return agentGroup;
        }
        catch {
            return null;
        }
    }
    normalizeAgentGroupCode(value) {
        return (0, agent_registry_1.toRuntimeAgentCode)(value);
    }
};
exports.AgentRouterService = AgentRouterService;
exports.AgentRouterService = AgentRouterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgentRouterService);
//# sourceMappingURL=agent-router.service.js.map