import { Controller, Get, Post, Body, Delete, Patch, Param } from '@nestjs/common';
import { DiseasesService } from './diseases.service';

@Controller('diseases')
export class DiseasesController {
  constructor(private readonly diseasesService: DiseasesService) {}

  @Get()
  findAll() {
    return this.diseasesService.findAll();
  }

  @Post()
  create(@Body() data: { name: string }) {
    return this.diseasesService.create(data);
  }

  @Delete()
  removeMany(@Body('ids') ids: string[]) {
    return this.diseasesService.removeMany(ids);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() data: { name: string }
  ) {
    return this.diseasesService.update(id, data);
  }
}