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
exports.TrainingController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
const generate_learning_path_dto_1 = require("./dto/generate-learning-path.dto");
const submit_quiz_dto_1 = require("./dto/submit-quiz.dto");
const training_service_1 = require("./training.service");
let TrainingController = class TrainingController {
    trainingService;
    constructor(trainingService) {
        this.trainingService = trainingService;
    }
    async getTrainingRecommendations(request) {
        return this.trainingService.getTrainingRecommendationsForUser(request.user.userId);
    }
    async getLearningPath(request) {
        return this.trainingService.getLearningPathForUser(request.user.userId);
    }
    async generateLearningPath(request, body) {
        return this.trainingService.generateLearningPathForUser(request.user.userId, body);
    }
    async submitQuiz(request, body) {
        return this.trainingService.submitQuizAttempt(request.user.userId, body);
    }
    async getQuizResult(request, id) {
        return this.trainingService.getQuizAttemptResult(request.user.userId, id);
    }
};
exports.TrainingController = TrainingController;
__decorate([
    (0, common_1.Get)('me/training-recommendations'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TrainingController.prototype, "getTrainingRecommendations", null);
__decorate([
    (0, common_1.Get)('me/learning-path'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TrainingController.prototype, "getLearningPath", null);
__decorate([
    (0, common_1.Post)('me/learning-path/generate'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_learning_path_dto_1.GenerateLearningPathDto]),
    __metadata("design:returntype", Promise)
], TrainingController.prototype, "generateLearningPath", null);
__decorate([
    (0, common_1.Post)('quiz/submit'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, submit_quiz_dto_1.SubmitQuizDto]),
    __metadata("design:returntype", Promise)
], TrainingController.prototype, "submitQuiz", null);
__decorate([
    (0, common_1.Get)('quiz/:id/result'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TrainingController.prototype, "getQuizResult", null);
exports.TrainingController = TrainingController = __decorate([
    (0, common_1.Controller)('api'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [training_service_1.TrainingService])
], TrainingController);
//# sourceMappingURL=training.controller.js.map