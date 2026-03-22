import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { AdminGuard } from '../../core/guards/admin.guard';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';

@Controller('api/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers() {
    return this.usersService.findAllWithRolesAndAccess();
  }

  @Put(':id/access')
  async updateUserAccess(
    @Param('id') id: string,
    @Body() body: UpdateUserAccessDto,
  ) {
    return this.usersService.updateAgentAccess(
      id,
      body.agentGroupCode,
      body.isAllowed,
    );
  }
}
