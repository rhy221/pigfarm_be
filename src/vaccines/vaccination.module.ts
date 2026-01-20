import { Module } from '@nestjs/common';
import { VaccinationService } from './vaccination.service';
import { VaccinationController } from './vaccination.controller';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [VaccinationController],
  providers: [VaccinationService],
  exports: [VaccinationService]
})
export class VaccinationModule {}