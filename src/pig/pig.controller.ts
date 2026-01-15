import { Controller, Get, Param, Query } from '@nestjs/common';
import { PigService } from './pig.service';

@Controller('pigs')
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
}