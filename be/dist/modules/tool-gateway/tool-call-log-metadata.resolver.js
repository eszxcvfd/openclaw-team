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
exports.ToolCallLogMetadataResolver = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const agent_registry_1 = require("../agent-router/agent-registry");
let ToolCallLogMetadataResolver = class ToolCallLogMetadataResolver {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolve(request, agentCode) {
        const method = request.method.toUpperCase();
        const routePath = this.resolveRoutePath(request);
        const normalizedPath = this.normalizeRoutePath(request, routePath);
        const resolvedAgentCode = (0, agent_registry_1.toDbAgentGroupCode)(agentCode) ?? this.inferAgentCode(normalizedPath);
        const [apiRecord, agentGroupRecord] = await Promise.all([
            this.prisma.backend_api_catalog.findFirst({
                where: {
                    http_method: method,
                    path: normalizedPath,
                },
                select: {
                    id: true,
                },
            }),
            resolvedAgentCode
                ? this.prisma.agent_groups.findUnique({
                    where: {
                        code: resolvedAgentCode,
                    },
                    select: {
                        id: true,
                    },
                })
                : Promise.resolve(null),
        ]);
        const toolRecord = apiRecord && agentGroupRecord
            ? await this.prisma.agent_group_tools.findFirst({
                where: {
                    agent_group_id: agentGroupRecord.id,
                    is_allowed: true,
                    tools: {
                        api_id: apiRecord.id,
                    },
                },
                select: {
                    tool_id: true,
                },
            })
            : null;
        return {
            normalizedPath,
            routePath,
            method,
            apiId: apiRecord?.id ?? null,
            toolId: toolRecord?.tool_id ?? null,
            agentGroupId: agentGroupRecord?.id ?? null,
        };
    }
    resolveRoutePath(request) {
        if (typeof request.route?.path === 'string') {
            return request.route.path;
        }
        return this.stripQueryString(request.originalUrl ?? request.url ?? '/');
    }
    normalizeRoutePath(request, routePath) {
        const basePath = this.ensureLeadingSlash(request.baseUrl ?? '');
        const sanitizedRoutePath = this.ensureLeadingSlash(this.stripQueryString(routePath));
        if (!basePath || sanitizedRoutePath.startsWith(basePath)) {
            return sanitizedRoutePath;
        }
        return `${basePath}${sanitizedRoutePath}`.replace(/\/+/g, '/');
    }
    stripQueryString(value) {
        return value.split('?')[0] || '/';
    }
    ensureLeadingSlash(value) {
        if (!value) {
            return '';
        }
        return value.startsWith('/') ? value : `/${value}`;
    }
    inferAgentCode(normalizedPath) {
        if (normalizedPath === '/api/quiz/submit' ||
            /\/api\/quiz\/[^/]+\/result$/.test(normalizedPath)) {
            return 'learning_training';
        }
        return undefined;
    }
};
exports.ToolCallLogMetadataResolver = ToolCallLogMetadataResolver;
exports.ToolCallLogMetadataResolver = ToolCallLogMetadataResolver = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ToolCallLogMetadataResolver);
//# sourceMappingURL=tool-call-log-metadata.resolver.js.map