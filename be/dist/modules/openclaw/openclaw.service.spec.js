"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const openclaw_service_1 = require("./openclaw.service");
describe('OpenclawService', () => {
    let service;
    let configService;
    beforeEach(async () => {
        configService = {
            get: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                openclaw_service_1.OpenclawService,
                {
                    provide: config_1.ConfigService,
                    useValue: configService,
                },
            ],
        }).compile();
        service = module.get(openclaw_service_1.OpenclawService);
        global.fetch = jest.fn();
    });
    afterEach(() => {
        jest.resetAllMocks();
    });
    it('posts analytics runs to the configured /run endpoint and normalizes the response', async () => {
        configService.get.mockImplementation((key) => {
            if (key === 'openclaw.baseUrl') {
                return 'http://openclaw:8080';
            }
            if (key === 'openclaw.apiKey') {
                return 'api-key-1';
            }
            return undefined;
        });
        global.fetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                finalAnswer: 'Bao cao da san sang.',
                data: {
                    uiPayload: {
                        type: 'analytics-summary',
                        title: 'Department Summary',
                    },
                },
            }),
        });
        const result = await service.run({
            agentName: 'training_analytics_agent',
            message: 'Bao cao tien do dao tao phong Dev thang nay',
            context: {
                user: {
                    id: 'manager-1',
                    fullName: 'Manager One',
                    email: 'manager@example.com',
                    department: 'Engineering',
                    position: 'Manager',
                    roles: ['department_manager'],
                },
                session: {
                    conversationId: 'conv-1',
                    agentGroup: 'training_analytics_agent',
                    startedAt: '2026-03-23T00:00:00.000Z',
                    messageCount: 1,
                    recentTurns: [],
                },
                allowedResources: {
                    documents: [],
                    tools: ['get_department_training_analytics'],
                    scopes: ['read:analytics'],
                },
            },
            internalToken: 'internal-token-1',
            conversationId: 'conv-1',
            userId: 'manager-1',
            traceId: 'trace-1',
        });
        expect(global.fetch).toHaveBeenCalledWith('http://openclaw:8080/run', expect.objectContaining({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer api-key-1',
            },
        }));
        expect(result).toEqual({
            text: 'Bao cao da san sang.',
            uiPayload: {
                type: 'analytics-summary',
                title: 'Department Summary',
            },
        });
    });
    it('throws a wrapped availability error when OpenClaw is not configured', async () => {
        configService.get.mockReturnValue('');
        await expect(service.run({
            agentName: 'training_analytics_agent',
            message: 'Bao cao',
            context: {
                user: {
                    id: 'manager-1',
                    fullName: 'Manager One',
                    email: 'manager@example.com',
                    department: 'Engineering',
                    position: 'Manager',
                    roles: ['department_manager'],
                },
                session: {
                    conversationId: 'conv-1',
                    agentGroup: null,
                    startedAt: '2026-03-23T00:00:00.000Z',
                    messageCount: 1,
                    recentTurns: [],
                },
                allowedResources: {
                    documents: [],
                    tools: [],
                    scopes: [],
                },
            },
            internalToken: 'internal-token-1',
            conversationId: 'conv-1',
            userId: 'manager-1',
            traceId: 'trace-1',
        })).rejects.toBeInstanceOf(common_1.ServiceUnavailableException);
    });
});
//# sourceMappingURL=openclaw.service.spec.js.map