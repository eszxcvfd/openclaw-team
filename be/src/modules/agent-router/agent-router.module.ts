import { Module } from '@nestjs/common';

import { AgentRouterService } from './agent-router.service';

@Module({
  providers: [AgentRouterService],
  exports: [AgentRouterService],
})
export class AgentRouterModule {}
