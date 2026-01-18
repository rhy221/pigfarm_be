import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PigService } from './pig.service';
import { PigDashboardStatsDto, PenItemDto } from './pig.dto';

@ApiTags('Pig Management')
@Controller('pig')
export class PigController {
  constructor(private readonly pigService: PigService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê Dashboard (Số liệu môi trường là giả lập)' })
  @ApiResponse({ status: 200, type: PigDashboardStatsDto })
  getStats() {
    return this.pigService.getDashboardStats();
  }

  @Get('pens')
  @ApiOperation({ summary: 'Lấy danh sách chuồng (Nhiệt độ/Độ ẩm random mỗi lần reload)' })
  @ApiResponse({ status: 200, type: [PenItemDto] })
  getPenList() {
    return this.pigService.getPenList();
  }
}