import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';

import { OpenclawService } from './openclaw.service';

describe('OpenclawService', () => {
  let service: OpenclawService;
  let configService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenclawService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<OpenclawService>(OpenclawService);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('posts analytics runs to the configured /run endpoint and normalizes the response', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'openclaw.baseUrl') {
        return 'http://openclaw:8080';
      }

      if (key === 'openclaw.apiKey') {
        return 'api-key-1';
      }

      return undefined;
    });
    (global.fetch as jest.Mock).mockResolvedValue({
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
      backendBaseUrl: 'http://backend:3001',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://openclaw:8080/run',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer api-key-1',
        },
      }),
    );
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

    await expect(
      service.run({
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
        backendBaseUrl: 'http://backend:3001',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
