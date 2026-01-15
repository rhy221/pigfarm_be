import { Controller, Get, Post, Body, Param, Patch, ParseUUIDPipe } from '@nestjs/common';
import { HealthService } from './health.service';
import { CreateTreatmentDto, AddTreatmentLogDto, UpdatePigsStatusDto } from './dto/health.dto';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

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
  addLog(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddTreatmentLogDto) {
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
}