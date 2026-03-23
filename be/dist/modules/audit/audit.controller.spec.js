"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const admin_guard_1 = require("../../core/guards/admin.guard");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
const audit_controller_1 = require("./audit.controller");
const audit_service_1 = require("./audit.service");
describe('AuditController', () => {
    let controller;
    let service;
    const mockAuditService = {
        listAuditLogs: jest.fn(),
        getAuditLogDetail: jest.fn(),
    };
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            controllers: [audit_controller_1.AuditController],
            providers: [
                {
                    provide: audit_service_1.AuditService,
                    useValue: mockAuditService,
                },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(admin_guard_1.AdminGuard)
            .useValue({ canActivate: () => true })
            .compile();
        controller = module.get(audit_controller_1.AuditController);
        service = module.get(audit_service_1.AuditService);
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
//# sourceMappingURL=audit.controller.spec.js.map