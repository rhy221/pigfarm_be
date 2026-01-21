import { Controller, Get, Post, Body, Delete, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
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

@Get('products')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm theo loại (feed, medicine...)' })
  @ApiQuery({ name: 'type', required: false, description: 'Loại danh mục (VD: feed)' })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm tên hoặc mã' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID danh mục cụ thể' })
  getProducts(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string
  ) {
    return this.service.getProducts({ type, search, categoryId });
  }
}