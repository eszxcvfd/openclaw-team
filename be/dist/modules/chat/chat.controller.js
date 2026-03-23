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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const conversation_service_1 = require("./conversation.service");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
const send_message_dto_1 = require("./dto/send-message.dto");
let ChatController = class ChatController {
    chatService;
    conversationService;
    constructor(chatService, conversationService) {
        this.chatService = chatService;
        this.conversationService = conversationService;
    }
    async sendMessage(req, body) {
        const userId = req.user.userId;
        return this.chatService.processMessage(userId, body.message, body.sessionKey);
    }
    async listConversations(req) {
        const userId = req.user.userId;
        return this.conversationService.listConversations(userId);
    }
    async getMessages(req, id) {
        return this.conversationService.getMessagesForUser(req.user.userId, id);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('message'),
    (0, common_1.Sse)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('conversations'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Get)('conversations/:id/messages'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('api/chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        conversation_service_1.ConversationService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map