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
const DEFAULT_AGENT_ORDER = [
    'onboarding_assistant',
    'learning_training_agent',
    'training_analytics_agent',
];
const AGENT_ROUTE_PROFILES = {
    onboarding_assistant: {
        keywords: [
            /(onboard|onboarding|nhan vien moi|new hire|checklist|first day|faq|policy|support|contact)/i,
        ],
        tools: [
            'get_onboarding_faq',
            'get_support_contacts',
            'get_my_checklist',
            'complete_checklist_task',
        ],
        scopes: ['read:onboarding', 'read:checklist', 'write:checklist'],
    },
    learning_training_agent: {
        keywords: [
            /(training|dao tao|hoc|learning path|lo trinh|quiz|khoa hoc|course|skill|recommend)/i,
        ],
        tools: [
            'get_training_recommendations',
            'get_my_learning_path',
            'generate_learning_path',
            'generate_quiz',
        ],
        scopes: ['read:training', 'write:training'],
    },
    training_analytics_agent: {
        keywords: [
            /(analytics|bao cao|report|dashboard|kpi|feedback|phan tich|tong hop|department|phong ban)/i,
        ],
        tools: ['get_department_training_analytics'],
        scopes: ['read:analytics'],
    },
};
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
        const profile = AGENT_ROUTE_PROFILES[agentGroup];
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
            .map((entry) => this.normalizeAgentGroupCode(entry.agent_groups.code))
            .filter((entry) => Boolean(entry));
        if (explicitAllowed && explicitAllowed.length > 0) {
            return DEFAULT_AGENT_ORDER.filter((entry) => explicitAllowed.includes(entry));
        }
        const roleCodes = accessProfile?.user_roles.map((entry) => entry.roles.code.toLowerCase()) ?? [];
        const isManagerLike = roleCodes.some((roleCode) => /(manager|lead|supervisor|hr|admin)/i.test(roleCode));
        return isManagerLike
            ? DEFAULT_AGENT_ORDER
            : DEFAULT_AGENT_ORDER.filter((entry) => entry !== 'training_analytics_agent');
    }
    resolveRuleMatch(message, allowedAgentGroups) {
        for (const agentGroup of DEFAULT_AGENT_ORDER) {
            if (!allowedAgentGroups.includes(agentGroup)) {
                continue;
            }
            const matched = AGENT_ROUTE_PROFILES[agentGroup].keywords.some((pattern) => pattern.test(message));
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
        switch ((value ?? '').trim().toLowerCase()) {
            case 'onboarding_assistant':
                return 'onboarding_assistant';
            case 'learning_training_agent':
                return 'learning_training_agent';
            case 'training_analytics_agent':
                return 'training_analytics_agent';
            default:
                return null;
        }
    }
};
exports.AgentRouterService = AgentRouterService;
exports.AgentRouterService = AgentRouterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgentRouterService);
//# sourceMappingURL=agent-router.service.js.map