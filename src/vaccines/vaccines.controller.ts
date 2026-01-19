import { Controller, Get, Post, Body, Delete, Patch, Param } from '@nestjs/common';
import { VaccinesService } from './vaccines.service';

@Controller('vaccines')
export class VaccinesController {
  constructor(private readonly vaccinesService: VaccinesService) {}

  @Get()
  findAll() {
    return this.vaccinesService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.vaccinesService.create(data);
  }

  @Delete()
  removeMany(@Body('ids') ids: string[]) {
    return this.vaccinesService.removeMany(ids);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() data: any
  ) {
    return this.vaccinesService.update(id, data);
  }

  
}