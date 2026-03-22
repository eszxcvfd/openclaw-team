import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

export interface InternalTokenPayload {
  agent: string;
  userId: string;
  conversationId: string;
  scope: string[];
  iat?: number;
  exp?: number;
  jti: string;
}

@Injectable()
export class InternalTokenService {
  constructor(private readonly jwtService: JwtService) {}

  async createToken(
    agentGroup: string,
    userId: string,
    conversationId: string,
    scopes: string[],
  ): Promise<string> {
    const internalSecret = this.getInternalSecret();

    const payload: InternalTokenPayload = {
      agent: agentGroup,
      userId,
      conversationId,
      scope: scopes,
      jti: randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      secret: internalSecret,
      expiresIn: 300,
    });
  }

  async verifyToken(token: string): Promise<InternalTokenPayload> {
    const internalSecret = this.getInternalSecret();

    try {
      return await this.jwtService.verifyAsync<InternalTokenPayload>(token, {
        secret: internalSecret,
      });
    } catch (error) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired internal security token.',
        details: {},
      });
    }
  }

  private getInternalSecret() {
    const internalSecret = process.env.JWT_INTERNAL_SECRET?.trim();
    const accessSecret = process.env.JWT_ACCESS_SECRET?.trim();

    if (!internalSecret) {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Internal AI Security secret is not configured.',
      });
    }

    if (accessSecret && internalSecret === accessSecret) {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Internal AI Security secret must differ from access token secret.',
      });
    }

    return internalSecret;
  }
}
