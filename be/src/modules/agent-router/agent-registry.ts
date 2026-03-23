export type AgentRuntimeCode =
  | 'onboarding_assistant'
  | 'learning_training_agent'
  | 'training_analytics_agent';

export type AgentGroupDbCode =
  | 'onboarding'
  | 'learning_training'
  | 'training_analytics';

export interface AgentAllowedResourcesProfile {
  keywords: RegExp[];
  tools: string[];
  scopes: string[];
  submodules: string[];
}

export interface AgentRegistryEntry {
  runtimeCode: AgentRuntimeCode;
  dbCode: AgentGroupDbCode;
  profile: AgentAllowedResourcesProfile;
}

export const DEFAULT_AGENT_ORDER: AgentRuntimeCode[] = [
  'onboarding_assistant',
  'learning_training_agent',
  'training_analytics_agent',
];

export const AGENT_REGISTRY: Record<AgentRuntimeCode, AgentRegistryEntry> = {
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

const DB_TO_RUNTIME_CODE: Record<AgentGroupDbCode, AgentRuntimeCode> = {
  onboarding: 'onboarding_assistant',
  learning_training: 'learning_training_agent',
  training_analytics: 'training_analytics_agent',
};

const RUNTIME_TO_DB_CODE: Record<AgentRuntimeCode, AgentGroupDbCode> = {
  onboarding_assistant: 'onboarding',
  learning_training_agent: 'learning_training',
  training_analytics_agent: 'training_analytics',
};

export function toRuntimeAgentCode(value?: string | null): AgentRuntimeCode | null {
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

export function toDbAgentGroupCode(value?: string | null): AgentGroupDbCode | null {
  const runtimeCode = toRuntimeAgentCode(value);

  if (runtimeCode) {
    return RUNTIME_TO_DB_CODE[runtimeCode];
  }

  return null;
}

export function getAgentRegistryEntry(agentCode: AgentRuntimeCode): AgentRegistryEntry {
  return AGENT_REGISTRY[agentCode];
}

export function getRuntimeAgentCodesFromDbCodes(
  codes: Array<string | null | undefined>,
): AgentRuntimeCode[] {
  const resolved = new Set<AgentRuntimeCode>();

  for (const code of codes) {
    const runtimeCode = toRuntimeAgentCode(code);
    if (runtimeCode) {
      resolved.add(runtimeCode);
    }
  }

  return DEFAULT_AGENT_ORDER.filter((code) => resolved.has(code));
}

export function getDbAgentGroupCode(agentCode: AgentRuntimeCode): AgentGroupDbCode {
  return DB_TO_RUNTIME_CODE[RUNTIME_TO_DB_CODE[agentCode]]
    ? RUNTIME_TO_DB_CODE[agentCode]
    : AGENT_REGISTRY[agentCode].dbCode;
}
