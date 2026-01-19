import { Controller, Get, Post, Body, Delete, Patch, Param } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';

@Controller('warehouse-categories')
export class WarehouseCategoriesController {
  constructor(private readonly service: WarehouseService) {}

  @Get()
  findAllCategories() {
    return this.service.findAllCategories();
  }

  @Post()
  create(@Body() data: { name: string; type: string; description: string }) {
    return this.service.createCategory(data);
  }

  @Delete()
  removeMany(@Body('ids') ids: string[]) {
    return this.service.removeManyCategories(ids);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; type?: string; description?: string },
  ) {
    return this.service.updateCategory(id, data);
  }
}