import { SetMetadata } from '@nestjs/common';

export const AGENT_SCOPE_KEY = 'agent_scope';
export const AgentScope = (...scopes: string[]) => SetMetadata(AGENT_SCOPE_KEY, scopes);
