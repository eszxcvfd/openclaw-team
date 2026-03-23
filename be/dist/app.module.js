"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_config_1 = require("./config/app.config");
const db_config_1 = require("./config/db.config");
const env_config_1 = require("./config/env.config");
const openclaw_config_1 = require("./config/openclaw.config");
const redis_config_1 = require("./config/redis.config");
const prisma_module_1 = require("./infra/prisma/prisma.module");
const agent_router_module_1 = require("./modules/agent-router/agent-router.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const audit_module_1 = require("./modules/audit/audit.module");
const auth_module_1 = require("./modules/auth/auth.module");
const chat_module_1 = require("./modules/chat/chat.module");
const context_builder_module_1 = require("./modules/context-builder/context-builder.module");
const documents_module_1 = require("./modules/documents/documents.module");
const health_module_1 = require("./modules/health/health.module");
const iam_module_1 = require("./modules/iam/iam.module");
const jobs_module_1 = require("./modules/jobs/jobs.module");
const onboarding_module_1 = require("./modules/onboarding/onboarding.module");
const openclaw_module_1 = require("./modules/openclaw/openclaw.module");
const tool_gateway_module_1 = require("./modules/tool-gateway/tool-gateway.module");
const training_module_1 = require("./modules/training/training.module");
const users_module_1 = require("./modules/users/users.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [env_config_1.envConfig, app_config_1.appConfig, db_config_1.dbConfig, redis_config_1.redisConfig, openclaw_config_1.openclawConfig],
            }),
            prisma_module_1.PrismaModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            audit_module_1.AuditModule,
            iam_module_1.IamModule,
            chat_module_1.ChatModule,
            agent_router_module_1.AgentRouterModule,
            context_builder_module_1.ContextBuilderModule,
            tool_gateway_module_1.ToolGatewayModule,
            openclaw_module_1.OpenclawModule,
            onboarding_module_1.OnboardingModule,
            training_module_1.TrainingModule,
            analytics_module_1.AnalyticsModule,
            documents_module_1.DocumentsModule,
            jobs_module_1.JobsModule,
            users_module_1.UsersModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map