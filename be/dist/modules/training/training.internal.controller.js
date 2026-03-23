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
exports.TrainingInternalController = void 0;
const common_1 = require("@nestjs/common");
const agent_scope_decorator_1 = require("../auth/decorators/agent-scope.decorator");
const internal_agent_guard_1 = require("../auth/guards/internal-agent.guard");
const generate_learning_path_dto_1 = require("./dto/generate-learning-path.dto");
const generate_quiz_dto_1 = require("./dto/generate-quiz.dto");
const training_service_1 = require("./training.service");
let TrainingInternalController = class TrainingInternalController {
    trainingService;
    constructor(trainingService) {
        this.trainingService = trainingService;
    }
    async getTrainingRecommendations(request) {
        return this.trainingService.getTrainingRecommendationsForUser(request.internalAgent.userId);
    }
    async getLearningPath(request) {
        return this.trainingService.getLearningPathForUser(request.internalAgent.userId);
    }
    async generateLearningPath(request, body) {
        return this.trainingService.generateLearningPathForUser(request.internalAgent.userId, body);
    }
    async generateQuiz(request, body) {
        return this.trainingService.generateQuizForUser(request.internalAgent.userId, body);
    }
};
exports.TrainingInternalController = TrainingInternalController;
__decorate([
    (0, common_1.Get)('me/training-recommendations'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('read:training'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TrainingInternalController.prototype, "getTrainingRecommendations", null);
__decorate([
    (0, common_1.Get)('me/learning-path'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('read:training'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TrainingInternalController.prototype, "getLearningPath", null);
__decorate([
    (0, common_1.Post)('me/learning-path/generate'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('write:training'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_learning_path_dto_1.GenerateLearningPathDto]),
    __metadata("design:returntype", Promise)
], TrainingInternalController.prototype, "generateLearningPath", null);
__decorate([
    (0, common_1.Post)('quiz/generate'),
    (0, common_1.UseGuards)(internal_agent_guard_1.InternalAgentGuard),
    (0, agent_scope_decorator_1.AgentScope)('write:training'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_quiz_dto_1.GenerateQuizDto]),
    __metadata("design:returntype", Promise)
], TrainingInternalController.prototype, "generateQuiz", null);
exports.TrainingInternalController = TrainingInternalController = __decorate([
    (0, common_1.Controller)('internal/tools/training'),
    __metadata("design:paramtypes", [training_service_1.TrainingService])
], TrainingInternalController);
//# sourceMappingURL=training.internal.controller.js.map