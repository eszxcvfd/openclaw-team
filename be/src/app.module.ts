import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfig } from './config/app.config';
import { dbConfig } from './config/db.config';
import { envConfig } from './config/env.config';
import { openclawConfig } from './config/openclaw.config';
import { redisConfig } from './config/redis.config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AgentRouterModule } from './modules/agent-router/agent-router.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { ContextBuilderModule } from './modules/context-builder/context-builder.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { HealthModule } from './modules/health/health.module';
import { IamModule } from './modules/iam/iam.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { OpenclawModule } from './modules/openclaw/openclaw.module';
import { ToolGatewayModule } from './modules/tool-gateway/tool-gateway.module';
import { TrainingModule } from './modules/training/training.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig, appConfig, dbConfig, redisConfig, openclawConfig],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AuditModule,
    IamModule,
    ChatModule,
    AgentRouterModule,
    ContextBuilderModule,
    ToolGatewayModule,
    OpenclawModule,
    OnboardingModule,
    TrainingModule,
    AnalyticsModule,
    DocumentsModule,
    JobsModule,
    UsersModule,
  ],
})
export class AppModule {}
