"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const tool_call_log_metadata_resolver_1 = require("./tool-call-log-metadata.resolver");
describe('ToolCallLogMetadataResolver', () => {
    let resolver;
    const prisma = {
        agent_group_tools: {
            findFirst: jest.fn(),
        },
        backend_api_catalog: {
            findFirst: jest.fn(),
        },
        agent_groups: {
            findUnique: jest.fn(),
        },
    };
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                tool_call_log_metadata_resolver_1.ToolCallLogMetadataResolver,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prisma,
                },
            ],
        }).compile();
        resolver = module.get(tool_call_log_metadata_resolver_1.ToolCallLogMetadataResolver);
    });
    it('normalizes baseUrl and route path, then resolves catalog ids', async () => {
        prisma.backend_api_catalog.findFirst.mockResolvedValue({ id: 'api-1' });
        prisma.agent_group_tools.findFirst.mockResolvedValue({ tool_id: 'tool-1' });
        prisma.agent_groups.findUnique.mockResolvedValue({ id: 'agent-group-1' });
        const result = await resolver.resolve({
            method: 'get',
            baseUrl: '/internal/tools/onboarding',
            route: { path: 'faq' },
            originalUrl: '/internal/tools/onboarding/faq',
        }, 'onboarding');
        expect(prisma.backend_api_catalog.findFirst).toHaveBeenCalledWith({
            where: {
                http_method: 'GET',
                path: '/internal/tools/onboarding/faq',
            },
            select: {
                id: true,
            },
        });
        expect(prisma.agent_group_tools.findFirst).toHaveBeenCalledWith({
            where: {
                agent_group_id: 'agent-group-1',
                is_allowed: true,
                tools: {
                    api_id: 'api-1',
                },
            },
            select: {
                tool_id: true,
            },
        });
        expect(result).toEqual({
            normalizedPath: '/internal/tools/onboarding/faq',
            routePath: 'faq',
            method: 'GET',
            apiId: 'api-1',
            toolId: 'tool-1',
            agentGroupId: 'agent-group-1',
        });
    });
    it('falls back to originalUrl when route metadata is unavailable', async () => {
        prisma.backend_api_catalog.findFirst.mockResolvedValue(null);
        prisma.agent_groups.findUnique.mockResolvedValue(null);
        const result = await resolver.resolve({
            method: 'post',
            originalUrl: '/internal/tools/onboarding/me/checklist/task-id/complete?foo=bar',
            url: '/internal/tools/onboarding/me/checklist/task-id/complete?foo=bar',
        });
        expect(result.normalizedPath).toBe('/internal/tools/onboarding/me/checklist/task-id/complete');
        expect(result.toolId).toBeNull();
        expect(result.apiId).toBeNull();
        expect(result.agentGroupId).toBeNull();
    });
    it('returns null toolId when apiId exists but no allowed tool mapping is found for the agent', async () => {
        prisma.backend_api_catalog.findFirst.mockResolvedValue({ id: 'api-1' });
        prisma.agent_groups.findUnique.mockResolvedValue({ id: 'agent-group-1' });
        prisma.agent_group_tools.findFirst.mockResolvedValue(null);
        const result = await resolver.resolve({
            method: 'GET',
            baseUrl: '/internal/tools/onboarding',
            route: { path: 'faq' },
            originalUrl: '/internal/tools/onboarding/faq',
        }, 'onboarding');
        expect(result.apiId).toBe('api-1');
        expect(result.toolId).toBeNull();
        expect(result.agentGroupId).toBe('agent-group-1');
    });
});
//# sourceMappingURL=tool-call-log-metadata.resolver.spec.js.map