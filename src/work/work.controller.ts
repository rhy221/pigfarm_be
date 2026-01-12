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
