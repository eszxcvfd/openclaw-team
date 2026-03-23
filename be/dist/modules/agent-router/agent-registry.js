"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_REGISTRY = exports.DEFAULT_AGENT_ORDER = void 0;
exports.toRuntimeAgentCode = toRuntimeAgentCode;
exports.toDbAgentGroupCode = toDbAgentGroupCode;
exports.getAgentRegistryEntry = getAgentRegistryEntry;
exports.getRuntimeAgentCodesFromDbCodes = getRuntimeAgentCodesFromDbCodes;
exports.getDbAgentGroupCode = getDbAgentGroupCode;
exports.DEFAULT_AGENT_ORDER = [
    'onboarding_assistant',
    'learning_training_agent',
    'training_analytics_agent',
];
exports.AGENT_REGISTRY = {
    onboarding_assistant: {
        runtimeCode: 'onboarding_assistant',
        dbCode: 'onboarding',
        profile: {
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
            submodules: ['employee_guide', 'onboarding_checklist', 'new_hire_faq'],
        },
    },
    learning_training_agent: {
        runtimeCode: 'learning_training_agent',
        dbCode: 'learning_training',
        profile: {
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
            submodules: ['training_recommendation', 'learning_path', 'quiz_generator'],
        },
    },
    training_analytics_agent: {
        runtimeCode: 'training_analytics_agent',
        dbCode: 'training_analytics',
        profile: {
            keywords: [
                /(analytics|bao cao|report|dashboard|kpi|feedback|phan tich|tong hop|department|phong ban)/i,
            ],
            tools: ['get_department_training_analytics'],
            scopes: ['read:analytics'],
            submodules: ['feedback_analysis', 'progress_tracking', 'training_report'],
        },
    },
};
const DB_TO_RUNTIME_CODE = {
    onboarding: 'onboarding_assistant',
    learning_training: 'learning_training_agent',
    training_analytics: 'training_analytics_agent',
};
const RUNTIME_TO_DB_CODE = {
    onboarding_assistant: 'onboarding',
    learning_training_agent: 'learning_training',
    training_analytics_agent: 'training_analytics',
};
function toRuntimeAgentCode(value) {
    const normalized = (value ?? '').trim().toLowerCase();
    switch (normalized) {
        case 'onboarding_assistant':
            return 'onboarding_assistant';
        case 'learning_training_agent':
            return 'learning_training_agent';
        case 'training_analytics_agent':
            return 'training_analytics_agent';
        case 'onboarding':
            return 'onboarding_assistant';
        case 'learning_training':
            return 'learning_training_agent';
        case 'training_analytics':
            return 'training_analytics_agent';
        default:
            return null;
    }
}
function toDbAgentGroupCode(value) {
    const runtimeCode = toRuntimeAgentCode(value);
    if (runtimeCode) {
        return RUNTIME_TO_DB_CODE[runtimeCode];
    }
    return null;
}
function getAgentRegistryEntry(agentCode) {
    return exports.AGENT_REGISTRY[agentCode];
}
function getRuntimeAgentCodesFromDbCodes(codes) {
    const resolved = new Set();
    for (const code of codes) {
        const runtimeCode = toRuntimeAgentCode(code);
        if (runtimeCode) {
            resolved.add(runtimeCode);
        }
    }
    return exports.DEFAULT_AGENT_ORDER.filter((code) => resolved.has(code));
}
function getDbAgentGroupCode(agentCode) {
    return DB_TO_RUNTIME_CODE[RUNTIME_TO_DB_CODE[agentCode]]
        ? RUNTIME_TO_DB_CODE[agentCode]
        : exports.AGENT_REGISTRY[agentCode].dbCode;
}
//# sourceMappingURL=agent-registry.js.map