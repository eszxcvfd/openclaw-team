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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const agent_registry_1 = require("../agent-router/agent-registry");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllWithRolesAndAccess() {
        return this.prisma.users.findMany({
            include: {
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
                user_agent_access: {
                    include: {
                        agent_groups: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async updateAgentAccess(userId, agentGroupCode, isAllowed) {
        const normalizedAgentGroupCode = (0, agent_registry_1.toDbAgentGroupCode)(agentGroupCode);
        if (!normalizedAgentGroupCode) {
            throw new common_1.NotFoundException(`Agent group with code ${agentGroupCode} not found`);
        }
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        const agentGroup = await this.prisma.agent_groups.findUnique({
            where: { code: normalizedAgentGroupCode },
        });
        if (!agentGroup) {
            throw new common_1.NotFoundException(`Agent group with code ${agentGroupCode} not found`);
        }
        return this.prisma.user_agent_access.upsert({
            where: {
                user_id_agent_group_id: {
                    user_id: user.id,
                    agent_group_id: agentGroup.id,
                },
            },
            update: {
                is_allowed: isAllowed,
            },
            create: {
                user_id: user.id,
                agent_group_id: agentGroup.id,
                is_allowed: isAllowed,
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map