import { Module } from '@nestjs/common';
import { PigService } from './pig.service';
import { PigController } from './pig.controller';
import { PrismaService } from '../prisma/prisma.service'; 

@Module({
  controllers: [PigController],
  providers: [PigService, PrismaService],
  exports: [PigService],
})
export class PigModule {}