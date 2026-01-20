import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { UpdatePermissionDto } from './access-control.dto';

@Controller('access-control')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get()
  findAll() {
    return this.accessControlService.findAll();
  }

  @Patch(':roleId')
  update(
    @Param('roleId') roleId: string,
    @Body() updateDto: UpdatePermissionDto,
  ) {
    return this.accessControlService.update(roleId, updateDto);
  }
}