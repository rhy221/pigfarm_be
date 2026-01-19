import { Module } from '@nestjs/common';
import { WorkShiftsService } from './work.service';
import { WorkShiftsController } from './work.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WorkShiftsController],
  providers: [WorkShiftsService, PrismaService],
  exports: [WorkShiftsService],
})
export class WorkShiftsModule {}