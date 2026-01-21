import { Module } from '@nestjs/common';
import { CleaningMethodsService } from './cleaning-methods.service';
import { CleaningMethodsController } from './cleaning-methods.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CleaningMethodsController],
  providers: [CleaningMethodsService, PrismaService],
  exports: [CleaningMethodsService],
})
export class CleaningMethodsModule {}