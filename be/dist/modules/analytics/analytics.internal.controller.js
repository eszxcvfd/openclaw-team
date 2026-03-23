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
exports.AnalyticsInternalController = void 0;
const common_1 = require("@nestjs/common");
const agent_scope_decorator_1 = require("../auth/decorators/agent-scope.decorator");
const internal_agent_guard_1 = require("../auth/guards/internal-agent.guard");
const analytics_service_1 = require("./analytics.service");
let AnalyticsInternalController = class AnalyticsInternalController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getDepartmentSummary(request) {
        return this.analyticsService.getDepartmentSummaryForManager(request.internalAgent.userId);
    }
};
exports.AnalyticsInternalController = AnalyticsInternalController;
__decorate([
    (0, common_1.Get)('department'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('read:analytics'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsInternalController.prototype, "getDepartmentSummary", null);
exports.AnalyticsInternalController = AnalyticsInternalController = __decorate([
    (0, common_1.Controller)('internal/tools/analytics/training'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsInternalController);
//# sourceMappingURL=analytics.internal.controller.js.map