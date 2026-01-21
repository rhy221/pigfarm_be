import { Module } from '@nestjs/common';
import { PensController } from './pens.controller';
import { PensService } from './pens.service';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [PensController],
  providers: [PensService],
})
export class PensModule {}