"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const users_controller_1 = require("./users.controller");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
const admin_guard_1 = require("../../core/guards/admin.guard");
describe('UsersController', () => {
    let controller;
    let service;
    const mockUsersService = {
        findAllWithRolesAndAccess: jest.fn(),
        updateAgentAccess: jest.fn(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [users_controller_1.UsersController],
            providers: [
                {
                    provide: users_service_1.UsersService,
                    useValue: mockUsersService,
                },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(admin_guard_1.AdminGuard)
            .useValue({ canActivate: () => true })
            .compile();
        controller = module.get(users_controller_1.UsersController);
        service = module.get(users_service_1.UsersService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    describe('getUsers', () => {
        it('should call service.findAllWithRolesAndAccess', async () => {
            const mockResult = [{ id: '1', full_name: 'Test' }];
            mockUsersService.findAllWithRolesAndAccess.mockResolvedValue(mockResult);
            const result = await controller.getUsers();
            expect(service.findAllWithRolesAndAccess).toHaveBeenCalled();
            expect(result).toEqual(mockResult);
        });
    });
    describe('updateUserAccess', () => {
        it('should call service.updateAgentAccess', async () => {
            const mockResult = { success: true };
            mockUsersService.updateAgentAccess.mockResolvedValue(mockResult);
            const result = await controller.updateUserAccess('1', {
                agentGroupCode: 'agent_1',
                isAllowed: true,
            });
            expect(service.updateAgentAccess).toHaveBeenCalledWith('1', 'agent_1', true);
            expect(result).toEqual(mockResult);
        });
    });
});
//# sourceMappingURL=users.controller.spec.js.map