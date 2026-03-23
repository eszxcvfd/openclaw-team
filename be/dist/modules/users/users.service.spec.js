"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const users_service_1 = require("./users.service");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const common_1 = require("@nestjs/common");
describe('UsersService', () => {
    let service;
    let prisma;
    beforeEach(async () => {
        const mockPrisma = {
            users: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
            },
            user_agent_access: {
                upsert: jest.fn(),
            },
            agent_groups: {
                findUnique: jest.fn(),
            }
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                users_service_1.UsersService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: mockPrisma,
                },
            ],
        }).compile();
        service = module.get(users_service_1.UsersService);
        prisma = module.get(prisma_service_1.PrismaService);
    });
    describe('findAllWithRolesAndAccess', () => {
        it('should return users with their roles and agent access', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    email: 'test@example.com',
                    full_name: 'Test User',
                    status: 'active',
                    user_roles: [{ roles: { code: 'admin', name: 'Admin' } }],
                    user_agent_access: [{
                            is_allowed: true,
                            agent_groups: { code: 'training_analytics_agent' }
                        }]
                }
            ];
            prisma.users.findMany.mockResolvedValue(mockUsers);
            const result = await service.findAllWithRolesAndAccess();
            expect(prisma.users.findMany).toHaveBeenCalledWith({
                include: {
                    user_roles: { include: { roles: true } },
                    user_agent_access: { include: { agent_groups: true } },
                },
                orderBy: { created_at: 'desc' }
            });
            expect(result).toEqual(mockUsers);
        });
    });
    describe('updateAgentAccess', () => {
        it('should upsert user agent access if the user and agent group exist', async () => {
            prisma.users.findUnique.mockResolvedValue({ id: 'user-1' });
            prisma.agent_groups.findUnique.mockResolvedValue({ id: 'group-1' });
            const mockResult = { user_id: 'user-1', agent_group_id: 'group-1', is_allowed: true };
            prisma.user_agent_access.upsert.mockResolvedValue(mockResult);
            const result = await service.updateAgentAccess('user-1', 'training_analytics_agent', true);
            expect(prisma.user_agent_access.upsert).toHaveBeenCalledWith({
                where: { user_id_agent_group_id: { user_id: 'user-1', agent_group_id: 'group-1' } },
                update: { is_allowed: true },
                create: { user_id: 'user-1', agent_group_id: 'group-1', is_allowed: true }
            });
            expect(result).toEqual(mockResult);
        });
        it('should throw NotFoundException if user does not exist', async () => {
            prisma.users.findUnique.mockResolvedValue(null);
            await expect(service.updateAgentAccess('invalid-user', 'training_analytics_agent', true))
                .rejects.toThrow(common_1.NotFoundException);
        });
        it('should throw NotFoundException if agent group does not exist', async () => {
            prisma.users.findUnique.mockResolvedValue({ id: 'user-1' });
            prisma.agent_groups.findUnique.mockResolvedValue(null);
            await expect(service.updateAgentAccess('user-1', 'invalid_agent', true))
                .rejects.toThrow(common_1.NotFoundException);
        });
    });
});
//# sourceMappingURL=users.service.spec.js.map