import { Module } from '@nestjs/common';
import { WorkShiftsService } from './work.service';
import { WorkShiftsController } from './work.controller';
import { PrismaService } from '../prisma/prisma.service';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WorkRepository } from './work.repository';

@Module({
  controllers: [WorkShiftsController],
  providers: [WorkShiftsService, PrismaService],
  exports: [WorkShiftsService],
  controllers: [WorkController],
  providers: [WorkService, WorkRepository],
})
export class WorkShiftsModule {}
