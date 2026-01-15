import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { PigModule } from './pig/pig.module';
import { HealthModule } from './health/health.module';
import { SalesModule } from './sales/sales.module';
import { InventoryModule } from './inventory/inventory.module';
import { FinanceModule } from './finance/finance.module';
import { FacilityModule } from './facility/facility.module';
import { WorkModule } from './work/work.module';
import { ReportModule } from './report/report.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { WarehouseModule } from './warehouse/warehouse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PigModule,
    HealthModule,
    SalesModule,
    InventoryModule,
    FinanceModule,
    FacilityModule,
    WorkModule,
    ReportModule,
    ConfigurationModule,
    WarehouseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
