import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CleaningMethodsService } from './cleaning-methods.service';

@Controller('cleaning-methods')
export class CleaningMethodsController {
  constructor(private readonly service: CleaningMethodsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() data: { name: string }) {
    return this.service.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { name: string }) {
    return this.service.update(id, data);
  }

  @Delete()
  removeMany(@Body('ids') ids: string[]) {
    return this.service.removeMany(ids);
  }
}