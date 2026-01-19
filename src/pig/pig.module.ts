import { Module } from '@nestjs/common';
import { PigService } from './pig.service';
import { PigController } from './pig.controller';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [PigController],
  providers: [PigService]
})
export class PigModule {}