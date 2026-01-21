import { Controller, Get, Post, Body, Delete, Patch, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './users.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private prisma: PrismaService
  ) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return this.serialize(users);
  }

  @Get('groups')
  async findAllGroups() {
    const groups = await this.prisma.user_group.findMany();
    return JSON.parse(
      JSON.stringify(groups, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.serialize(user);
  }
  
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateData: any) {
    const user = await this.usersService.update(id, updateData);
    return this.serialize(user);
  }

  @Delete('batch')
  async removeMany(@Body('ids') ids: string[]) {
    return this.usersService.removeMany(ids);
  }

  private serialize(data: any) {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }
}