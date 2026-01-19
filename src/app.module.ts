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
import { WorkShiftsModule } from './work/work.module';
import { ReportModule } from './report/report.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { PensModule } from './pen/pens.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { DiseasesModule } from './diseases/diseases.module';
import { ChemicalsModule } from './chemicals/chemicals.module';
import { CleaningMethodsModule } from './cleaning-methods/cleaning-methods.module';
import { UserGroupModule } from './user-group/user-group.module';
import { UsersModule } from './users/users.module';
import { AccessControlModule } from './access-control/access-control.module';

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
    WorkShiftsModule,
    ReportModule,
    ConfigurationModule,
    WarehouseModule,
    PensModule,
    VaccinesModule,
    DiseasesModule,
    ChemicalsModule,
    CleaningMethodsModule,
    UserGroupModule,
    UsersModule,
    AccessControlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
