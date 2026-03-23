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
exports.ConversationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
let ConversationService = class ConversationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findConversationBySession(userId, sessionKey) {
        const key = sessionKey || `default-${userId}`;
        return this.prisma.conversations.findUnique({
            where: {
                user_id_session_key: {
                    user_id: userId,
                    session_key: key,
                },
            },
            include: {
                agent_groups: true,
            },
        });
    }
    async getOrCreateConversation(userId, agentGroupCode, sessionKey) {
        const key = sessionKey || `default-${userId}`;
        let agentGroupId = null;
        if (agentGroupCode) {
            const group = await this.prisma.agent_groups.findUnique({
                where: { code: agentGroupCode },
            });
            agentGroupId = group?.id;
        }
        return this.prisma.conversations.upsert({
            where: {
                user_id_session_key: {
                    user_id: userId,
                    session_key: key,
                },
            },
            update: {
                status: 'open',
                agent_group_id: agentGroupId,
            },
            create: {
                user_id: userId,
                session_key: key,
                agent_group_id: agentGroupId,
                status: 'open',
            },
        });
    }
    async saveMessage(conversationId, senderType, content, userId, metadata = {}) {
        return this.prisma.messages.create({
            data: {
                conversation_id: conversationId,
                sender_type: senderType,
                sender_user_id: userId,
                content,
                metadata: this.toJsonObject(metadata),
            },
        });
    }
    async getMessagesForUser(userId, conversationId) {
        const conversation = await this.prisma.conversations.findFirst({
            where: {
                id: conversationId,
                user_id: userId,
            },
            select: {
                id: true,
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException(`Conversation with ID ${conversationId} not found`);
        }
        return this.prisma.messages.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'asc' },
            select: {
                id: true,
                sender_type: true,
                content: true,
                metadata: true,
                created_at: true,
            },
        });
    }
    async listConversations(userId) {
        const conversations = await this.prisma.conversations.findMany({
            where: { user_id: userId },
            include: {
                agent_groups: true,
                messages: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: {
                        content: true,
                    },
                },
            },
            orderBy: { started_at: 'desc' },
        });
        return conversations.map(({ messages, ...conversation }) => ({
            ...conversation,
            preview: messages[0]?.content?.trim() || null,
        }));
    }
    toJsonObject(value) {
        return JSON.parse(JSON.stringify(value));
    }
};
exports.ConversationService = ConversationService;
exports.ConversationService = ConversationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationService);
//# sourceMappingURL=conversation.service.js.map