import { Module } from '@nestjs/common';
import { DiseasesController } from './diseases.controller';
import { DiseasesService } from './diseases.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiseasesController],
  providers: [DiseasesService],
  exports: [DiseasesService],
})
export class DiseasesModule {}