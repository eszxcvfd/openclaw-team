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
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizQuestionTypes = exports.quizDifficulties = exports.GenerateQuizDto = void 0;
const class_validator_1 = require("class-validator");
const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard'];
const QUIZ_QUESTION_TYPES = [
    'single_choice',
    'multiple_choice',
    'true_false',
    'short_answer',
];
class GenerateQuizDto {
    templateId;
    courseId;
    queryText;
    difficulty;
    questionCount;
    questionTypes;
}
exports.GenerateQuizDto = GenerateQuizDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GenerateQuizDto.prototype, "templateId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GenerateQuizDto.prototype, "courseId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateQuizDto.prototype, "queryText", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(QUIZ_DIFFICULTIES),
    __metadata("design:type", Object)
], GenerateQuizDto.prototype, "difficulty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(20),
    __metadata("design:type", Number)
], GenerateQuizDto.prototype, "questionCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(10),
    (0, class_validator_1.IsIn)(QUIZ_QUESTION_TYPES, { each: true }),
    __metadata("design:type", Array)
], GenerateQuizDto.prototype, "questionTypes", void 0);
exports.quizDifficulties = QUIZ_DIFFICULTIES;
exports.quizQuestionTypes = QUIZ_QUESTION_TYPES;
//# sourceMappingURL=generate-quiz.dto.js.map