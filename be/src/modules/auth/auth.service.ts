import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { verifyPassword } from './auth-password.util';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
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

    const isPasswordValid = await verifyPassword(
      loginDto.password,
      user?.password_hash ?? null,
    );

    const isUserActive =
      user?.status === 'active' && user.deleted_at === null;

    if (!user || !isPasswordValid || !isUserActive) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Email hoac mat khau khong hop le.',
        details: {},
      });
    }

    const primaryRole = user.user_roles[0]?.roles;
    const department = user.departments;
    const accessTokenTtlSeconds =
      Number(process.env.JWT_ACCESS_TTL_SECONDS) || 3600;
    const refreshTokenTtlSeconds =
      Number(process.env.JWT_REFRESH_TTL_SECONDS) || 604800;
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
      this.jwtService.signAsync(
        {
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
        },
        {
          secret: accessTokenSecret,
          expiresIn: accessTokenTtlSeconds,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          tokenType: 'refresh',
        },
        {
          secret: refreshTokenSecret,
          expiresIn: refreshTokenTtlSeconds,
        },
      ),
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

  private getRequiredEnv(key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET') {
    const value = process.env[key]?.trim();

    if (!value) {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Authentication service is not configured.',
        details: {},
      });
    }

    return value;
  }
}
