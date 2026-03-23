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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const auth_password_util_1 = require("./auth-password.util");
let AuthService = class AuthService {
    prismaService;
    jwtService;
    constructor(prismaService, jwtService) {
        this.prismaService = prismaService;
        this.jwtService = jwtService;
    }
    async login(loginDto) {
        const user = await this.prismaService.users.findUnique({
            where: {
                email: loginDto.email,
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
        const isPasswordValid = await (0, auth_password_util_1.verifyPassword)(loginDto.password, user?.password_hash ?? null);
        const isUserActive = user?.status === 'active' && user.deleted_at === null;
        if (!user || !isPasswordValid || !isUserActive) {
            throw new common_1.UnauthorizedException({
                code: 'UNAUTHORIZED',
                message: 'Email hoac mat khau khong hop le.',
                details: {},
            });
        }
        const primaryRole = user.user_roles[0]?.roles;
        const department = user.departments;
        const accessTokenTtlSeconds = Number(process.env.JWT_ACCESS_TTL_SECONDS) || 3600;
        const refreshTokenTtlSeconds = Number(process.env.JWT_REFRESH_TTL_SECONDS) || 604800;
        const accessTokenSecret = this.getRequiredEnv('JWT_ACCESS_SECRET');
        const refreshTokenSecret = this.getRequiredEnv('JWT_REFRESH_SECRET');
        await this.prismaService.users.update({
            where: {
                id: user.id,
            },
            data: {
                last_login_at: new Date(),
            },
        });
        const userSummary = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: primaryRole?.name ?? 'Unassigned',
            roleCode: primaryRole?.code ?? 'unassigned',
            department: department?.name ?? 'Unassigned',
            departmentCode: department?.code ?? 'unassigned',
        };
        const [userAccessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({
                sub: user.id,
                email: user.email,
                role: {
                    code: userSummary.roleCode,
                    name: userSummary.role,
                },
                department: {
                    code: userSummary.departmentCode,
                    name: userSummary.department,
                },
                tokenType: 'access',
            }, {
                secret: accessTokenSecret,
                expiresIn: accessTokenTtlSeconds,
            }),
            this.jwtService.signAsync({
                sub: user.id,
                tokenType: 'refresh',
            }, {
                secret: refreshTokenSecret,
                expiresIn: refreshTokenTtlSeconds,
            }),
        ]);
        return {
            user: userSummary,
            tokens: {
                userAccessToken,
                refreshToken,
                tokenType: 'Bearer',
                expiresIn: accessTokenTtlSeconds,
            },
        };
    }
    getRequiredEnv(key) {
        const value = process.env[key]?.trim();
        if (!value) {
            throw new common_1.InternalServerErrorException({
                code: 'INTERNAL_ERROR',
                message: 'Authentication service is not configured.',
                details: {},
            });
        }
        return value;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map