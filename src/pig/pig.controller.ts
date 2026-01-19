import { Controller, Get, Param, Query, Delete, Post, Body, Patch } from '@nestjs/common';
import { PigService } from './pig.service';

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
}