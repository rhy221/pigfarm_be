import { Controller, Get, Post, Delete, Body, Patch, Param } from '@nestjs/common';
import { PensService } from './pens.service';

@Controller('pens')
export class PensController {
  constructor(private readonly pensService: PensService) {}

  @Get()
  findAll() {
    return this.pensService.findAll();
  }

  @Get('types')
  findAllTypes() {
    return this.pensService.findAllTypes();
  }

  @Post()
  create(@Body() data: { pen_name: string; pen_type_id: string }) {
    return this.pensService.create(data);
  }

  @Delete()
  removeMany(@Body() data: { ids: string[] }) {
    return this.pensService.removeMany(data.ids);
  }

  @Post('types')
  createType(@Body() data: { pen_type_name: string }) {
    return this.pensService.createType(data);
  }

  @Delete('types')
  removeTypes(@Body() data: { ids: string[] }) {
    return this.pensService.removeTypes(data.ids);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: { pen_name?: string; pen_type_id?: string },
  ) {
    return this.pensService.update(id, data);
  }

  @Patch('types/:id')
  updateType(
    @Param('id') id: string,
    @Body() data: { pen_type_name: string },
  ) {
    return this.pensService.updateType(id, data);
  }
}