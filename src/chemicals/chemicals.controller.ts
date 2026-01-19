import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ChemicalsService } from './chemicals.service';

@Controller('chemicals')
export class ChemicalsController {
  constructor(private readonly chemicalsService: ChemicalsService) {}

  @Get()
  findAll() {
    return this.chemicalsService.findAll();
  }

  @Post()
  create(@Body() data: { name: string }) {
    return this.chemicalsService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { name: string }) {
    return this.chemicalsService.update(id, data);
  }

  @Delete()
  removeMany(@Body('ids') ids: string[]) {
    return this.chemicalsService.removeMany(ids);
  }
}