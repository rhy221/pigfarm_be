import { Module } from '@nestjs/common';
import { WarehouseCategoriesController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseCategoriesController],
  providers: [WarehouseService],
})
export class WarehouseModule {}
