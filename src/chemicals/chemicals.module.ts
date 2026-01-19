import { Module } from '@nestjs/common';
import { ChemicalsService } from './chemicals.service';
import { ChemicalsController } from './chemicals.controller';
import { PrismaService } from '../prisma/prisma.service'; 

@Module({
  controllers: [ChemicalsController],
  providers: [ChemicalsService, PrismaService],
  exports: [ChemicalsService], 
})
export class ChemicalsModule {}