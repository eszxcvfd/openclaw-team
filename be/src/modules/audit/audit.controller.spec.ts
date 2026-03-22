import { Test, TestingModule } from '@nestjs/testing';

import { AdminGuard } from '../../core/guards/admin.guard';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  let service: AuditService;

  const mockAuditService = {
    listAuditLogs: jest.fn(),
    getAuditLogDetail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists audit logs via service', async () => {
    const query = { page: 1, pageSize: 20, user: 'alice' };
    const mockResult = {
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      },
    };

    mockAuditService.listAuditLogs.mockResolvedValue(mockResult);

    const result = await controller.listAuditLogs(query);

    expect(service.listAuditLogs).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockResult);
  });

  it('returns detail via service', async () => {
    const detail = {
      id: 'log-1',
      traceId: 'trace-1',
      tokenScope: ['read:onboarding'],
    };

    mockAuditService.getAuditLogDetail.mockResolvedValue(detail);

    const result = await controller.getAuditLogDetail('log-1');

    expect(service.getAuditLogDetail).toHaveBeenCalledWith('log-1');
    expect(result).toEqual(detail);
  });
});
