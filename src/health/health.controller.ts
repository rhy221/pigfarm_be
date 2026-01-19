import { HealthService } from './health.service';
import {
  CreateTreatmentDto,
  AddTreatmentLogDto,
  UpdatePigsStatusDto,
} from './dto/health.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Patch, Delete, Body, Query, Param, ParseUUIDPipe, } from '@nestjs/common';

import { 
  MarkVaccinatedDto, 
  DailyVaccinationDetailDto,
  CreateManualScheduleDto,
  UpdateScheduleDto, 
} from './health.dto';

import { 
  CreateTemplateDto, 
  VaccinationTemplateResponseDto, 
  VaccinationSuggestionDto 
} from './template.dto';

@ApiTags('Health Management')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('pens')
  getAllPens() {
    return this.healthService.getAllPens();
  }

  @Get('pen-types')
  getAllPenTypes() {
    return this.healthService.getAllPenTypes();
  }

  @Get('active')
  getActiveTreatments() {
    return this.healthService.getActiveTreatments();
  }

  @Get('history')
  getTreatmentHistory() {
    return this.healthService.getTreatmentHistory();
  }

  @Get(':id')
  getTreatmentDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthService.getTreatmentDetail(id);
  }

  @Post()
  createTreatment(@Body() dto: CreateTreatmentDto) {
    return this.healthService.createTreatment(dto);
  }

  @Post(':id/logs')
  addLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTreatmentLogDto,
  ) {
    return this.healthService.addLog(id, dto);
  }

  @Patch('report-death')
  reportDeath(@Body() dto: UpdatePigsStatusDto) {
    return this.healthService.reportDeath(dto);
  }

  @Patch('transfer-recovered')
  transferRecovered(@Body() dto: UpdatePigsStatusDto) {
    return this.healthService.transferRecovered(dto);
  }

  @Patch(':id')
  updateTreatment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { symptom?: string }
  ) {
    return this.healthService.updateTreatment(id, dto);
  }

  @Patch('logs/:id')
  updateLog(@Param('id') id: string, @Body() dto: any) {
    return this.healthService.updateLog(id, dto);
  }
  
  // ==========================================
  // PHẦN 1: QUẢN LÝ LỊCH TIÊM & ĐIỂM DANH (CALENDAR)
  // Base URL: /health/vaccination/...
  // ==========================================

  @Get('vaccination/calendar')
  @ApiOperation({ summary: 'Lấy lịch tiêm chủng tổng quan theo tháng (Calendar View)' })
  @ApiQuery({ name: 'month', example: 3, type: Number, description: 'Tháng cần xem' })
  @ApiQuery({ name: 'year', example: 2025, type: Number, description: 'Năm cần xem' })
  @ApiResponse({
    status: 200,
    description: 'Object JSON: Key là ngày (YYYY-MM-DD), Value là danh sách vaccine',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-123' },
            name: { type: 'string', example: 'Suyễn heo' },
            status: { type: 'string', example: 'pending' }
          }
        }
      },
      example: {
        "2025-03-13": [
          { "id": "uuid-1", "name": "Suyễn heo", "status": "pending" },
          { "id": "uuid-2", "name": "Dịch tả", "status": "completed" }
        ]
      }
    }
  })
  getCalendar(
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.healthService.getVaccinationCalendar(Number(month), Number(year));
  }

  @Get('vaccination/details')
  @ApiOperation({ summary: 'Lấy chi tiết danh sách chuồng cần tiêm trong một ngày cụ thể' })
  @ApiQuery({ name: 'date', example: '2025-03-13', description: 'Format YYYY-MM-DD' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhóm theo Vaccine và Mũi tiêm',
    type: [DailyVaccinationDetailDto], 
  })
  getDailyDetails(@Query('date') date: string) {
    return this.healthService.getDailyDetails(date);
  }

@Patch('vaccination/complete')
  @ApiOperation({ summary: 'Xác nhận/Đánh dấu các lịch đã tiêm xong' })
  @ApiBody({ type: MarkVaccinatedDto })
  @ApiResponse({
    status: 200,
    description: 'Đã xử lý thành công',
  })
  markAsComplete(@Body() body: MarkVaccinatedDto) {
    return this.healthService.markAsVaccinated(body.items);
  }

@Post('vaccination/manual')
  @ApiOperation({ summary: 'Tạo lịch tiêm thủ công (cho nhiều chuồng cùng lúc)' })
  @ApiBody({ type: CreateManualScheduleDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  createManual(@Body() body: CreateManualScheduleDto) {
    return this.healthService.createManualSchedule(body);
  }

  @Patch('vaccination/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin một lịch tiêm cụ thể (Dời lịch)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  updateSchedule(
    @Param('id') id: string, 
    @Body() body: UpdateScheduleDto
  ) {
    return this.healthService.updateSchedule(id, body);
  }

  @Delete('vaccination/:id')
  @ApiOperation({ summary: 'Xóa một lịch tiêm (nếu tạo nhầm)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  deleteSchedule(@Param('id') id: string) {
    return this.healthService.deleteSchedule(id);
  }

  // ==========================================
  // PHẦN 2: QUẢN LÝ MẪU TIÊM CHỦNG (TEMPLATES)
  // Base URL: /health/templates/...
  // ==========================================

  @Get('templates')
  @ApiOperation({ summary: 'Lấy danh sách cấu hình mẫu tiêm chủng' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các dòng trong bảng mẫu tiêm',
    type: [VaccinationTemplateResponseDto],
  })
  getTemplates() {
    return this.healthService.getVaccinationTemplates();
  }

  @Put('templates')
  @ApiOperation({ summary: 'Cập nhật toàn bộ danh sách mẫu tiêm (Ghi đè)' }) 
  @ApiBody({ 
    type: [CreateTemplateDto], 
    description: 'Gửi lên mảng chứa toàn bộ các dòng cấu hình hiện có. Danh sách cũ sẽ bị xóa và thay thế bằng danh sách này.'
  })
  @ApiResponse({
    status: 200, 
    description: 'Trả về danh sách mới nhất sau khi lưu',
    type: [VaccinationTemplateResponseDto]
  })
  saveTemplates(@Body() body: CreateTemplateDto[]) {
    return this.healthService.saveVaccinationTemplates(body);
  }

  @Get('templates/suggestions')
  @ApiOperation({ summary: 'Lấy danh sách các gợi ý tiêm chủng (cho phần Gợi ý tiêm)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các thẻ gợi ý màu sắc kèm thông tin vaccine',
    type: [VaccinationSuggestionDto]
  })
  getSuggestions() {
    return this.healthService.getVaccinationSuggestions();
  }

  @Post('templates/item')
  @ApiOperation({ summary: 'Thêm mới một dòng mẫu tiêm chủng' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({
    status: 201,
    description: 'Trả về chi tiết mẫu vừa tạo',
    type: VaccinationTemplateResponseDto
  })
  addTemplateItem(@Body() body: CreateTemplateDto) {
    return this.healthService.addTemplate(body);
  }

  @Delete('templates/item/:id')
  @ApiOperation({ summary: 'Xóa một dòng mẫu tiêm chủng theo ID' })
  @ApiQuery({ name: 'id', example: 'uuid-can-xoa', description: 'ID của dòng template cần xóa' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  deleteTemplateItem(@Param('id') id: string) {
    return this.healthService.deleteTemplate(id);
  }
}