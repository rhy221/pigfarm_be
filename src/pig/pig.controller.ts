import { Controller, Get, Param, Query, Delete, Post, Body, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PigService } from './pig.service';
import { PigDashboardStatsDto, PenItemDto } from './pig.dto';

@ApiTags('Pig Management')
@Controller('pig')
export class PigController {
  constructor(private readonly pigService: PigService) {}

  @Get('pen/:penId')
  async getPigsByPen(@Param('penId') penId: string) {
    return this.pigService.findByPen(penId);
  }

  @Get('proposals')
  async getExportProposals() {
    return this.pigService.getExportProposals();
  }

  @Get('breed/:breedId')
  async getPigsByBreed(@Param('breedId') breedId: string) {
    return this.pigService.findByBreed(breedId);
  }

  @Get('pen/:penId/arrival-date')
  async getArrivalDate(@Param('penId') penId: string) {
    return this.pigService.getArrivalDateByPen(penId);
  }

  @Get('breeds')
  findAllBreeds() {
    return this.pigService.findAllBreeds();
  }

  @Post('breeds')
  createBreed(@Body() data: { breed_name: string }) {
    return this.pigService.createBreed(data);
  }

  @Delete('breeds')
  removeBreeds(@Body() data: { ids: string[] }) {
    return this.pigService.removeBreeds(data.ids);
  }

  @Patch('breeds/:id')
  update(
    @Param('id') id: string,
    @Body() data: { breed_name: string },
  ) {
    return this.pigService.update(id, data);
  } // ✅ THIẾU DẤU NÀY

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
