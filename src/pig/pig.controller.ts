import { Controller, Get, Param, Query, Delete, Post, Body, Patch, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PigService } from './pig.service';
import { PigDashboardStatsDto, PenItemDto, ImportPigBatchDto, ImportBatchResponseDto, UpdatePigListDto, TransferPigDto, PigBatchResponseDto } from './pig.dto';

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
  }
  
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

  @Post('import-batch')
  @ApiOperation({ summary: 'Tiếp nhận heo (Tạo lứa mới HOẶC Thêm vào lứa cũ)' })
  @ApiResponse({ status: 201, type: ImportBatchResponseDto })
  async importBatch(@Body() dto: ImportPigBatchDto) {
    return this.pigService.importPigBatch(dto);
  }

  @Put('update-details')
  @ApiOperation({ summary: 'Cập nhật chi tiết heo (Mã tai, Trọng lượng) hàng loạt' })
  async updatePigDetails(@Body() dto: UpdatePigListDto) {
    return this.pigService.updatePigDetails(dto);
  }

  @Get('isolation-pens')
  @ApiOperation({ summary: 'Lấy danh sách chuồng loại Cách ly (Để hiển thị dropdown)' })
  async getIsolationPens() {
    return this.pigService.getIsolationPens();
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Chuyển chuồng (Thường & Cách ly)' })
  async transferPigs(@Body() dto: TransferPigDto) {
    return this.pigService.transferPigs(dto);
  }

  @Get('batches')
  @ApiOperation({ summary: 'Lấy danh sách lứa heo (Hỗ trợ dropdown chọn lứa cũ)' })
  @ApiResponse({ status: 200, type: [PigBatchResponseDto] })
  async getAllBatches() {
    return this.pigService.getAllBatches();
  }
}
