import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WorkShiftsService } from './work.service';

@Controller('work-shifts')
export class WorkShiftsController {
  constructor(private readonly workShiftsService: WorkShiftsService) {}

  @Get()
  findAll() {
    return this.workShiftsService.findAll();
  }

  @Post()
  create(@Body() data: { session: string; start_time: string; end_time: string }) {
    return this.workShiftsService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.workShiftsService.update(id, data);
  }

  @Delete()
  removeMany(@Body('ids') ids: string[]) {
    return this.workShiftsService.removeMany(ids);
  }
}