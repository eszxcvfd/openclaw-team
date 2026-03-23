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
exports.ContextBuilderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
let ContextBuilderService = class ContextBuilderService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async build(userId, conversationId, options = {}) {
        const [user, session, documents] = await Promise.all([
            this.buildUserContext(userId),
            this.buildConversationContext(conversationId, options.agentGroup),
            this.buildAllowedDocuments(userId),
        ]);
        return {
            user,
            session,
            allowedResources: {
                documents,
                tools: options.allowedResources?.tools ?? [],
                scopes: options.allowedResources?.scopes ?? [],
            },
        };
    }
    async buildUserContext(userId) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            include: {
                departments: true,
                positions: true,
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        return {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            department: user.departments?.name ?? null,
            position: user.positions?.name ?? null,
            roles: user.user_roles.map(({ roles }) => roles.code),
        };
    }
    async buildConversationContext(conversationId, agentGroupOverride) {
        const conversation = await this.prisma.conversations.findUnique({
            where: { id: conversationId },
            include: {
                agent_groups: true,
                _count: {
                    select: {
                        messages: true,
                    },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException(`Conversation with ID ${conversationId} not found`);
        }
        const recentMessages = await this.prisma.messages.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'desc' },
            take: 10,
        });
        return {
            conversationId: conversation.id,
            agentGroup: agentGroupOverride ?? conversation.agent_groups?.code ?? null,
            startedAt: conversation.started_at.toISOString(),
            messageCount: conversation._count.messages,
            recentTurns: recentMessages.reverse().map((message) => ({
                id: message.id,
                senderType: message.sender_type,
                content: message.content ?? '',
                createdAt: message.created_at.toISOString(),
            })),
        };
    }
    async buildAllowedDocuments(userId) {
        const roleAssignments = await this.prisma.user_roles.findMany({
            where: {
                user_id: userId,
            },
            select: {
                role_id: true,
            },
        });
        if (roleAssignments.length === 0) {
            return [];
        }
        const documents = await this.prisma.documents.findMany({
            where: {
                is_active: true,
                document_permissions: {
                    some: {
                        role_id: {
                            in: roleAssignments.map((entry) => entry.role_id),
                        },
                        can_view: true,
                    },
                },
            },
            select: {
                code: true,
            },
            orderBy: {
                code: 'asc',
            },
        });
        return documents
            .map((document) => document.code?.trim())
            .filter((document) => Boolean(document));
    }
};
exports.ContextBuilderService = ContextBuilderService;
exports.ContextBuilderService = ContextBuilderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContextBuilderService);
//# sourceMappingURL=context-builder.service.js.map