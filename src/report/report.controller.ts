import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import {
  HerdReportQueryDto,
  InventoryReportQueryDto,
  VaccineReportQueryDto,
  ExpenseReportQueryDto,
  RevenueReportQueryDto,
} from './dto';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('herd')
  getHerdReport(@Query() query: HerdReportQueryDto) {
    return this.reportService.getHerdReport(query);
  }

  @Get('inventory')
  getInventoryReport(@Query() query: InventoryReportQueryDto) {
    return this.reportService.getInventoryReport(query);
  }

  @Get('vaccines')
  getVaccineReport(@Query() query: VaccineReportQueryDto) {
    return this.reportService.getVaccineReport(query);
  }

  @Get('vaccines-list')
  getVaccinesList() {
    return this.reportService.getVaccinesList();
  }

  @Get('expenses')
  getExpenseReport(@Query() query: ExpenseReportQueryDto) {
    return this.reportService.getExpenseReport(query);
  }

  @Get('revenue')
  getRevenueReport(@Query() query: RevenueReportQueryDto) {
    return this.reportService.getRevenueReport(query);
  }
}
