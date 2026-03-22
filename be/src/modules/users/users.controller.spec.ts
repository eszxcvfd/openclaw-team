import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { AdminGuard } from '../../core/guards/admin.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findAllWithRolesAndAccess: jest.fn(),
    updateAgentAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
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
