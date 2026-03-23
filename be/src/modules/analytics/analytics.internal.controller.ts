import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { AgentScope } from '../auth/decorators/agent-scope.decorator';
import { InternalAgentGuard } from '../auth/guards/internal-agent.guard';
import { AnalyticsService, DepartmentAnalyticsSummaryDto } from './analytics.service';

interface InternalAgentRequest {
  internalAgent: {
    userId: string;
  };
}

@Controller('internal/tools/analytics/training')
export class AnalyticsInternalController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('department')
  @UseGuards(InternalAgentGuard)
  @AgentScope('read:analytics')
  async getDepartmentSummary(
    @Req() request: InternalAgentRequest,
  ): Promise<DepartmentAnalyticsSummaryDto> {
    return this.analyticsService.getDepartmentSummaryForManager(request.internalAgent.userId);
  }
}
