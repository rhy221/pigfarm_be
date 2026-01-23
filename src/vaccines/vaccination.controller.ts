import { Controller, Get, Post, Put, Patch, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { VaccinationService } from './vaccination.service';
import { 
  MarkVaccinatedDto, 
  DailyVaccinationDetailDto,
  CreateManualScheduleDto,
  UpdateScheduleDto, 
} from '../vaccines/vaccination-schedule.dto';
import { 
  CreateTemplateDto, 
  VaccinationTemplateResponseDto, 
  VaccinationSuggestionDto 
} from './vaccination-template.dto';

@ApiTags('Vaccination Management')
@Controller('vaccination')
export class VaccinationController {
  constructor(private readonly vaccinationService: VaccinationService) {}

  // --- CALENDAR & OPERATIONS ---
  @Get('calendar')
  @ApiOperation({ summary: 'Lấy lịch tiêm chủng tổng quan theo tháng (Calendar View)' })
  getCalendar(@Query('month') month: number, @Query('year') year: number) {
    return this.vaccinationService.getVaccinationCalendar(Number(month), Number(year));
  }

  @Get('details')
  @ApiOperation({ summary: 'Lấy chi tiết danh sách chuồng cần tiêm trong ngày' })
  getDailyDetails(@Query('date') date: string) {
    return this.vaccinationService.getDailyDetails(date);
  }

  @Patch('complete')
  @ApiOperation({ summary: 'Xác nhận/Đánh dấu các lịch đã tiêm xong' })
  markAsComplete(@Body() body: MarkVaccinatedDto) {
    return this.vaccinationService.markAsVaccinated(body.items);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Tạo lịch tiêm thủ công' })
  createManual(@Body() body: CreateManualScheduleDto) {
    return this.vaccinationService.createManualSchedule(body);
  }

  @Patch('schedule/:id')
  updateSchedule(@Param('id') id: string, @Body() body: UpdateScheduleDto) {
    return this.vaccinationService.updateSchedule(id, body);
  }

  @Delete('schedule/:id')
  deleteSchedule(@Param('id') id: string) {
    return this.vaccinationService.deleteSchedule(id);
  }
  
  @Get('vaccine-list')
  @ApiOperation({ summary: 'Lấy danh sách vaccine (cho dropdown)' })
  getAllVaccines() {
      return this.vaccinationService.getAllVaccines();
  }

  // --- TEMPLATES (CẤU HÌNH MẪU) ---
  @Get('templates')
  getTemplates() {
    return this.vaccinationService.getVaccinationTemplates();
  }

  @Put('templates')
  saveTemplates(@Body() body: CreateTemplateDto[]) {
    return this.vaccinationService.saveVaccinationTemplates(body);
  }

  @Get('templates/suggestions')
  getSuggestions() {
    return this.vaccinationService.getVaccinationSuggestions();
  }

  @Post('templates/item')
  addTemplateItem(@Body() body: CreateTemplateDto) {
    return this.vaccinationService.addTemplate(body);
  }

  @Delete('templates/item/:id')
  deleteTemplateItem(@Param('id') id: string) {
    return this.vaccinationService.deleteTemplate(id);
  }

  @Get('active-pens')
  @ApiOperation({ summary: 'Lấy danh sách chuồng đang có heo (cho dropdown tạo lịch)' })
  getActivePens() {
      return this.vaccinationService.getActivePens();
  }

  @Delete('revert/:id')
  @ApiOperation({ summary: 'Hoàn tác: Hủy xác nhận tiêm' })
  async revertVaccination(@Param('id') id: string) {
    await this.vaccinationService.revertVaccination(id);
    
    return { 
        success: true, 
        message: 'Đã hoàn tác thành công' 
    };
  }
}