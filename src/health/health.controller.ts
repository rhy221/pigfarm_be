import { Controller, Get, Post, Patch, Body, Query } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';

import { 
  MarkVaccinatedDto, 
  DailyVaccinationDetailDto, 
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
  @ApiOperation({ summary: 'Xác nhận/Đánh dấu các lịch đã tiêm xong (Nút "Đã tiêm")' })
  @ApiBody({ type: MarkVaccinatedDto })
  @ApiResponse({
    status: 200,
    description: 'Kết quả update (số lượng bản ghi đã update)',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 }
      }
    }
  })
  markAsComplete(@Body() body: MarkVaccinatedDto) {
    return this.healthService.markAsVaccinated(body.scheduleIds);
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

  @Post('templates')
  @ApiOperation({ summary: 'Lưu toàn bộ danh sách mẫu tiêm (Cơ chế: Xóa cũ -> Tạo mới)' })
  @ApiBody({ 
    type: [CreateTemplateDto], 
    description: 'Gửi lên mảng chứa toàn bộ các dòng cấu hình hiện có trên bảng giao diện'
  })
  @ApiResponse({
    status: 201,
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
}