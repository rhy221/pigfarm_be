// health/health.controller.ts
import { HealthService } from './health.service';
import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  CreateTreatmentDto,
  AddTreatmentLogDto,
  UpdatePigsStatusDto,
} from './dto/health.dto';

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
}