"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const chat_controller_1 = require("./chat.controller");
const chat_service_1 = require("./chat.service");
const conversation_service_1 = require("./conversation.service");
const auth_module_1 = require("../auth/auth.module");
const context_builder_module_1 = require("../context-builder/context-builder.module");
const training_module_1 = require("../training/training.module");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, context_builder_module_1.ContextBuilderModule, training_module_1.TrainingModule],
        controllers: [chat_controller_1.ChatController],
        providers: [chat_service_1.ChatService, conversation_service_1.ConversationService],
        exports: [chat_service_1.ChatService, conversation_service_1.ConversationService],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map