import { Controller, Post, Get, Body, Param, Patch } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesDto } from './dto/create-sales.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('next-code')
  async getNextCode() {
    return this.salesService.getNextReceiptCode();
  }

  @Post()
  create(@Body() createSalesDto: CreateSalesDto) {
    return this.salesService.create(createSalesDto);
  }

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() data: any) {
    return this.salesService.updateStatus(id, data);
  }
}