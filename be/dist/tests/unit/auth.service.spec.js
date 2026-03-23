"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const auth_password_util_1 = require("../../modules/auth/auth-password.util");
const auth_service_1 = require("../../modules/auth/auth.service");
describe('AuthService', () => {
    const prismaService = {
        users: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };
    const jwtService = {
        signAsync: jest.fn(),
    };
    let authService;
    beforeEach(() => {
        authService = new auth_service_1.AuthService(prismaService, jwtService);
        jest.clearAllMocks();
        process.env.JWT_ACCESS_SECRET = 'unit-access-secret';
        process.env.JWT_REFRESH_SECRET = 'unit-refresh-secret';
        process.env.JWT_ACCESS_TTL_SECONDS = '3600';
        process.env.JWT_REFRESH_TTL_SECONDS = '604800';
    });
    it('returns user summary and tokens for valid credentials', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('CorrectHorseBatteryStaple');
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-1',
            email: 'employee@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Employee One',
            status: 'active',
            deleted_at: null,
            departments: {
                code: 'hr',
                name: 'Human Resources',
            },
            user_roles: [
                {
                    roles: {
                        code: 'hr_manager',
                        name: 'HR Manager',
                    },
                },
            ],
        });
        prismaService.users.update.mockResolvedValue(undefined);
        jwtService.signAsync
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token');
        const result = await authService.login({
            email: 'employee@openclaw.local',
            password: 'CorrectHorseBatteryStaple',
        });
        expect(result).toEqual({
            user: {
                id: 'user-1',
                email: 'employee@openclaw.local',
                fullName: 'Employee One',
                role: 'HR Manager',
                roleCode: 'hr_manager',
                department: 'Human Resources',
                departmentCode: 'hr',
            },
            tokens: {
                userAccessToken: 'access-token',
                refreshToken: 'refresh-token',
                tokenType: 'Bearer',
                expiresIn: 3600,
            },
        });
        expect(prismaService.users.update).toHaveBeenCalledTimes(1);
        expect(prismaService.users.findUnique).toHaveBeenCalledWith({
            where: {
                email: 'employee@openclaw.local',
            },
            include: {
                departments: true,
                user_roles: {
                    include: {
                        roles: true,
                    },
                    orderBy: {
                        created_at: 'desc',
                    },
                },
            },
        });
        expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
        expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, {
            sub: 'user-1',
            email: 'employee@openclaw.local',
            role: {
                code: 'hr_manager',
                name: 'HR Manager',
            },
            department: {
                code: 'hr',
                name: 'Human Resources',
            },
            tokenType: 'access',
        }, {
            secret: 'unit-access-secret',
            expiresIn: 3600,
        });
    });
    it('uses unassigned role and department defaults when user has no mappings', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('Fallback#Password1');
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-4',
            email: 'employee2@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Employee Four',
            status: 'active',
            deleted_at: null,
            departments: null,
            user_roles: [],
        });
        prismaService.users.update.mockResolvedValue(undefined);
        jwtService.signAsync
            .mockResolvedValueOnce('access-token-fallback')
            .mockResolvedValueOnce('refresh-token-fallback');
        const result = await authService.login({
            email: 'employee2@openclaw.local',
            password: 'Fallback#Password1',
        });
        expect(result.user.role).toBe('Unassigned');
        expect(result.user.department).toBe('Unassigned');
        expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, expect.objectContaining({
            role: {
                code: 'unassigned',
                name: 'Unassigned',
            },
            department: {
                code: 'unassigned',
                name: 'Unassigned',
            },
        }), expect.any(Object));
    });
    it('prefers the most recently assigned role when multiple roles exist', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('NewestRole#Password1');
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-5',
            email: 'employee5@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Employee Five',
            status: 'active',
            deleted_at: null,
            departments: {
                code: 'it',
                name: 'Information Technology',
            },
            user_roles: [
                {
                    roles: {
                        code: 'team_lead',
                        name: 'Team Lead',
                    },
                },
                {
                    roles: {
                        code: 'employee',
                        name: 'Employee',
                    },
                },
            ],
        });
        prismaService.users.update.mockResolvedValue(undefined);
        jwtService.signAsync
            .mockResolvedValueOnce('access-token-newest-role')
            .mockResolvedValueOnce('refresh-token-newest-role');
        const result = await authService.login({
            email: 'employee5@openclaw.local',
            password: 'NewestRole#Password1',
        });
        expect(result.user.role).toBe('Team Lead');
        expect(result.user.roleCode).toBe('team_lead');
    });
    it('throws UnauthorizedException for inactive users', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('Inactive#Password1');
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-6',
            email: 'inactive@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Inactive Employee',
            status: 'inactive',
            deleted_at: null,
            departments: null,
            user_roles: [],
        });
        await expect(authService.login({
            email: 'inactive@openclaw.local',
            password: 'Inactive#Password1',
        })).rejects.toBeInstanceOf(common_1.UnauthorizedException);
    });
    it('throws UnauthorizedException for soft-deleted users', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('Deleted#Password1');
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-7',
            email: 'deleted@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Deleted Employee',
            status: 'active',
            deleted_at: new Date('2026-03-22T00:00:00.000Z'),
            departments: null,
            user_roles: [],
        });
        await expect(authService.login({
            email: 'deleted@openclaw.local',
            password: 'Deleted#Password1',
        })).rejects.toBeInstanceOf(common_1.UnauthorizedException);
    });
    it('throws InternalServerErrorException when JWT secrets are missing', async () => {
        const passwordHash = await (0, auth_password_util_1.hashPassword)('MissingSecret#Password1');
        delete process.env.JWT_ACCESS_SECRET;
        delete process.env.JWT_REFRESH_SECRET;
        prismaService.users.findUnique.mockResolvedValue({
            id: 'user-8',
            email: 'employee8@openclaw.local',
            password_hash: passwordHash,
            full_name: 'Employee Eight',
            status: 'active',
            deleted_at: null,
            departments: null,
            user_roles: [],
        });
        await expect(authService.login({
            email: 'employee8@openclaw.local',
            password: 'MissingSecret#Password1',
        })).rejects.toBeInstanceOf(common_1.InternalServerErrorException);
        expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
    it('throws UnauthorizedException for invalid credentials', async () => {
        prismaService.users.findUnique.mockResolvedValue(null);
        await expect(authService.login({
            email: 'missing@openclaw.local',
            password: 'wrong-password',
        })).rejects.toBeInstanceOf(common_1.UnauthorizedException);
    });
});
//# sourceMappingURL=auth.service.spec.js.map