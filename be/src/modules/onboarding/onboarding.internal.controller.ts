import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AgentScope } from '../auth/decorators/agent-scope.decorator';
import { InternalAgentGuard } from '../auth/guards/internal-agent.guard';
import {
  ChecklistItem,
  CompletedChecklistTask,
  OnboardingFaqItem,
  OnboardingService,
  SupportContact,
} from './onboarding.service';
import { CompleteChecklistTaskDto } from './dto/complete-checklist-task.dto';

interface InternalAgentRequest {
  internalAgent: {
    userId: string;
  };
}

@Controller('internal/tools/onboarding')
export class OnboardingInternalController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('faq')
  @UseGuards(InternalAgentGuard)
  @AgentScope('read:onboarding')
  async getFaq(): Promise<OnboardingFaqItem[]> {
    return this.onboardingService.getFaqItems();
  }

  @Get('contacts/support')
  @UseGuards(InternalAgentGuard)
  @AgentScope('read:onboarding')
  async getSupportContacts(): Promise<SupportContact[]> {
    return this.onboardingService.getSupportContacts();
  }

  @Get('me/checklist')
  @UseGuards(InternalAgentGuard)
  @AgentScope('read:checklist')
  async getChecklist(
    @Req() request: InternalAgentRequest,
  ): Promise<ChecklistItem[]> {
    return this.onboardingService.getChecklistItems(request.internalAgent.userId);
  }

  @Post('me/checklist/:taskId/complete')
  @UseGuards(InternalAgentGuard)
  @AgentScope('write:checklist')
  async completeChecklistTask(
    @Req() request: InternalAgentRequest,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() body: CompleteChecklistTaskDto,
  ): Promise<CompletedChecklistTask> {
    return this.onboardingService.completeChecklistTask(
      request.internalAgent.userId,
      taskId,
      body.note,
    );
  }
}
