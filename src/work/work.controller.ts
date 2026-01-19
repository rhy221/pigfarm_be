import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { WorkShiftsService } from './work.service';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { WorkService } from './work.service';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto } from './dto';

@Controller('work-shifts')
export class WorkShiftsController {
  constructor(private readonly workShiftsService: WorkShiftsService) {}

  @Get()
  findAll() {
    return this.workShiftsService.findAll();
  }

  @Post()
  create(
    @Body() data: { session: string; start_time: string; end_time: string },
  ) {
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
@Controller('work')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Get('tasks')
  findAll(@Query() query: QueryTaskDto) {
    return this.workService.findAll(query);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.workService.findOne(id);
  }

  @Post('tasks')
  create(@Body() dto: CreateTaskDto) {
    return this.workService.create(dto);
  }

  @Put('tasks/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.workService.update(id, dto);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.workService.remove(id);
  }

  @Get('employees')
  getEmployees() {
    return this.workService.getEmployees();
  }

  @Get('pens')
  getPens() {
    return this.workService.getPens();
  }
}
