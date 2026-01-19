import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserGroupService } from './user-group.service';

@Controller('user-groups')
export class UserGroupController {
  constructor(private readonly userGroupService: UserGroupService) {}

  @Get()
  findAll() {
    return this.userGroupService.findAll();
  }

  @Post()
  create(@Body() data: { name: string }) {
    return this.userGroupService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { name: string }) {
    return this.userGroupService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userGroupService.remove(id);
  }
}