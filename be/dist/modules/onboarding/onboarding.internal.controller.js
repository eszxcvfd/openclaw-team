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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingInternalController = void 0;
const common_1 = require("@nestjs/common");
const agent_scope_decorator_1 = require("../auth/decorators/agent-scope.decorator");
const internal_agent_guard_1 = require("../auth/guards/internal-agent.guard");
const onboarding_service_1 = require("./onboarding.service");
const complete_checklist_task_dto_1 = require("./dto/complete-checklist-task.dto");
let OnboardingInternalController = class OnboardingInternalController {
    onboardingService;
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    async getFaq() {
        return this.onboardingService.getFaqItems();
    }
    async getSupportContacts() {
        return this.onboardingService.getSupportContacts();
    }
    async getChecklist(request) {
        return this.onboardingService.getChecklistItems(request.internalAgent.userId);
    }
    async completeChecklistTask(request, taskId, body) {
        return this.onboardingService.completeChecklistTask(request.internalAgent.userId, taskId, body.note);
    }
};
exports.OnboardingInternalController = OnboardingInternalController;
__decorate([
    (0, common_1.Get)('faq'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('read:onboarding'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OnboardingInternalController.prototype, "getFaq", null);
__decorate([
    (0, common_1.Get)('contacts/support'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('read:onboarding'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OnboardingInternalController.prototype, "getSupportContacts", null);
__decorate([
    (0, common_1.Get)('me/checklist'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('read:checklist'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OnboardingInternalController.prototype, "getChecklist", null);
__decorate([
    (0, common_1.Post)('me/checklist/:taskId/complete'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('write:checklist'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, complete_checklist_task_dto_1.CompleteChecklistTaskDto]),
    __metadata("design:returntype", Promise)
], OnboardingInternalController.prototype, "completeChecklistTask", null);
exports.OnboardingInternalController = OnboardingInternalController = __decorate([
    (0, common_1.Controller)('internal/tools/onboarding'),
    __metadata("design:paramtypes", [onboarding_service_1.OnboardingService])
], OnboardingInternalController);
//# sourceMappingURL=onboarding.internal.controller.js.map