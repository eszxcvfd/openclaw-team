import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { ToolGatewayModule } from '../tool-gateway/tool-gateway.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalAgentGuard } from './guards/internal-agent.guard';
import { InternalTokenService } from './internal-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    ToolGatewayModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, InternalTokenService, InternalAgentGuard],
  exports: [AuthService, JwtStrategy, PassportModule, InternalTokenService, InternalAgentGuard],
})
export class AuthModule {}
