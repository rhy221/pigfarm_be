# Backend Implementation Plan: Work & Report Modules (v2)

## Overview

Implementation plan for **Work** and **Report** modules in NestJS backend, với **Repository Pattern** tách biệt Data Access Layer.

## Architecture

```
Controller  →  Service  →  Repository  →  Prisma
   (HTTP)    (Business)    (DB Queries)   (Client)
```

---

## Phase 0: Database Migration

### 0.1 Thêm fields cho `assignment_details`

```sql
ALTER TABLE assignment_details 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'other',
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### 0.2 Thêm FK cho Report Tables

```sql
ALTER TABLE herd_report_pens 
ADD COLUMN IF NOT EXISTS herd_report_id UUID REFERENCES herd_reports(id);

ALTER TABLE inventory_report_items 
ADD COLUMN IF NOT EXISTS inventory_report_id UUID REFERENCES inventory_reports(id);

ALTER TABLE vaccine_report_details 
ADD COLUMN IF NOT EXISTS vaccine_report_id UUID REFERENCES vaccine_reports(id);
```

### 0.3 Chạy Migration

```bash
npx prisma migrate dev --name add_missing_fields
npx prisma generate
```

---

## Phase 1: Foundation Setup

### 1.1 Install Dependencies

```bash
npm install class-validator class-transformer
```

### 1.2 Prisma Module

**File**: `src/prisma/prisma.module.ts`
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**File**: `src/prisma/prisma.service.ts`
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 1.3 Global Validation

**File**: `src/main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

---

## Phase 2: Work Module

### 2.1 DTOs

**File**: `src/work/dto/create-task.dto.ts`
```typescript
import { IsString, IsUUID, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  NIGHT = 'night',
}

export enum TaskType {
  FEEDING = 'feeding',
  CLEANING = 'cleaning',
  HEALTH_CHECK = 'health_check',
  VACCINATION = 'vaccination',
  MONITORING = 'monitoring',
  OTHER = 'other',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateTaskDto {
  @IsDateString()
  date: string;

  @IsEnum(ShiftType)
  shift: ShiftType;

  @IsUUID()
  barnId: string;

  @IsUUID()
  employeeId: string;

  @IsEnum(TaskType)
  taskType: TaskType;

  @IsString()
  taskDescription: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

**File**: `src/work/dto/update-task.dto.ts`
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
```

**File**: `src/work/dto/query-task.dto.ts`
```typescript
import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { TaskStatus } from './create-task.dto';

export class QueryTaskDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
```

**File**: `src/work/dto/index.ts`
```typescript
export * from './create-task.dto';
export * from './update-task.dto';
export * from './query-task.dto';
```

### 2.2 Repository

**File**: `src/work/work.repository.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkRepository {
  constructor(private prisma: PrismaService) {}

  private readonly includeRelations = {
    assignments: true,
    employees: true,
    pens: true,
    work_shifts: true,
  };

  async findAll(where: any) {
    return this.prisma.assignment_details.findMany({
      where,
      include: this.includeRelations,
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.assignment_details.findUnique({
      where: { id },
      include: this.includeRelations,
    });
  }

  async create(data: any) {
    return this.prisma.assignment_details.create({
      data,
      include: this.includeRelations,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.assignment_details.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
      include: this.includeRelations,
    });
  }

  async delete(id: string) {
    await this.prisma.assignment_details.delete({ where: { id } });
  }

  async findOrCreateAssignment(date: Date) {
    let assignment = await this.prisma.assignments.findFirst({
      where: { assignment_date: date },
    });
    if (!assignment) {
      assignment = await this.prisma.assignments.create({
        data: { assignment_date: date },
      });
    }
    return assignment;
  }

  async findOrCreateShift(session: string) {
    let shift = await this.prisma.work_shifts.findFirst({
      where: { session },
    });
    if (!shift) {
      shift = await this.prisma.work_shifts.create({
        data: { session, start_time: new Date(), end_time: new Date() },
      });
    }
    return shift;
  }

  async findAllEmployees() {
    return this.prisma.employees.findMany({
      select: { id: true, name: true, role: true, email: true },
    });
  }

  async findAllPens() {
    return this.prisma.pens.findMany({
      select: { id: true, pen_name: true, pen_type_id: true },
    });
  }
}
```

### 2.3 Service

**File**: `src/work/work.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkRepository } from './work.repository';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto } from './dto';

@Injectable()
export class WorkService {
  constructor(private repo: WorkRepository) {}

  private mapToResponse(detail: any) {
    return {
      id: detail.id,
      date: detail.assignments?.assignment_date?.toISOString().split('T')[0],
      shift: detail.work_shifts?.session || '',
      barnId: detail.pen_id,
      barnName: detail.pens?.pen_name || '',
      employeeId: detail.employee_id,
      employeeName: detail.employees?.name || '',
      taskType: detail.task_type || 'other',
      taskDescription: detail.task_description || '',
      status: detail.status || 'pending',
      notes: detail.notes || '',
      createdAt: detail.created_at,
      updatedAt: detail.updated_at,
    };
  }

  async findAll(query: QueryTaskDto) {
    const where: any = {};
    if (query.startDate || query.endDate) {
      where.assignments = {
        assignment_date: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        },
      };
    }
    if (query.status) where.status = query.status;

    const details = await this.repo.findAll(where);
    return details.map(d => this.mapToResponse(d));
  }

  async findOne(id: string) {
    const detail = await this.repo.findById(id);
    if (!detail) throw new NotFoundException(`Task ${id} not found`);
    return this.mapToResponse(detail);
  }

  async create(dto: CreateTaskDto) {
    const shift = await this.repo.findOrCreateShift(dto.shift);
    const assignment = await this.repo.findOrCreateAssignment(new Date(dto.date));

    const detail = await this.repo.create({
      assignment_id: assignment.id,
      employee_id: dto.employeeId,
      pen_id: dto.barnId,
      shift_id: shift.id,
      task_description: dto.taskDescription,
      task_type: dto.taskType,
      status: dto.status || 'pending',
      notes: dto.notes || '',
    });
    return this.mapToResponse(detail);
  }

  async update(id: string, dto: UpdateTaskDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Task ${id} not found`);

    const updateData: any = {};
    if (dto.taskDescription !== undefined) updateData.task_description = dto.taskDescription;
    if (dto.employeeId !== undefined) updateData.employee_id = dto.employeeId;
    if (dto.barnId !== undefined) updateData.pen_id = dto.barnId;
    if (dto.taskType !== undefined) updateData.task_type = dto.taskType;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.shift) {
      const shift = await this.repo.findOrCreateShift(dto.shift);
      updateData.shift_id = shift.id;
    }
    if (dto.date) {
      const assignment = await this.repo.findOrCreateAssignment(new Date(dto.date));
      updateData.assignment_id = assignment.id;
    }

    const updated = await this.repo.update(id, updateData);
    return this.mapToResponse(updated);
  }

  async remove(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Task ${id} not found`);
    await this.repo.delete(id);
  }

  getEmployees() {
    return this.repo.findAllEmployees();
  }

  getPens() {
    return this.repo.findAllPens();
  }
}
```

### 2.4 Controller

**File**: `src/work/work.controller.ts`
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { WorkService } from './work.service';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto } from './dto';

@Controller('work')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Get('tasks')
  findAll(@Query() query: QueryTaskDto) {
    return this.workService.findAll(query);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.workService.findOne(id);
  }

  @Post('tasks')
  create(@Body() dto: CreateTaskDto) {
    return this.workService.create(dto);
  }

  @Put('tasks/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.workService.update(id, dto);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.workService.remove(id);
  }

  @Get('employees')
  getEmployees() {
    return this.workService.getEmployees();
  }

  @Get('pens')
  getPens() {
    return this.workService.getPens();
  }
}
```

### 2.5 Module

**File**: `src/work/work.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WorkRepository } from './work.repository';

@Module({
  controllers: [WorkController],
  providers: [WorkService, WorkRepository],
})
export class WorkModule {}
```

---

## Phase 3: Report Module

### 3.1 DTOs

**File**: `src/report/dto/herd-report.dto.ts`
```typescript
import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class HerdReportQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  pen?: string;

  @IsOptional()
  @IsUUID()
  batch?: string;
}

export class PenStatDto {
  penId: string;
  penName: string;
  healthyCount: number;
  sickCount: number;
  deadCount: number;
  shippedCount: number;
}

export class HerdReportResponseDto {
  date: string;
  totalPigs: number;
  pens: PenStatDto[];
}
```

**File**: `src/report/dto/inventory-report.dto.ts`
```typescript
import { IsOptional, IsString } from 'class-validator';

export class InventoryReportQueryDto {
  @IsOptional()
  @IsString()
  month?: string; // Format: YYYY-MM
}

export class InventoryItemDto {
  materialId: string;
  materialName: string;
  openingStock: number;
  changeAmount: number;
  closingStock: number;
}

export class InventoryReportResponseDto {
  month: string;
  items: InventoryItemDto[];
  trends: { month: string; value: number }[];
}
```

**File**: `src/report/dto/vaccine-report.dto.ts`
```typescript
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class VaccineReportQueryDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsUUID()
  vaccine?: string;
}

export class VaccineDetailDto {
  vaccineId: string;
  vaccineName: string;
  diseaseName: string;
  cost: number;
  totalVaccinated: number;
  sickCount: number;
  effectivenessRate: number;
}

export class VaccineReportResponseDto {
  month: string;
  totalCost: number;
  totalPigs: number;
  totalSick: number;
  avgEffectiveness: number;
  details: VaccineDetailDto[];
}
```

**File**: `src/report/dto/expense-report.dto.ts`
```typescript
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class ExpenseReportQueryDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['paid', 'unpaid', 'all'])
  status?: string;
}

export class ExpenseItemDto {
  id: string;
  receiptCode: string;
  date: string;
  category: string;
  amount: number;
  paymentStatus: string;
}

export class ExpenseReportResponseDto {
  month: string;
  totalExpense: number;
  paidExpense: number;
  unpaidExpense: number;
  expenses: ExpenseItemDto[];
}
```

**File**: `src/report/dto/revenue-report.dto.ts`
```typescript
import { IsOptional, IsString } from 'class-validator';

export class RevenueReportQueryDto {
  @IsOptional()
  @IsString()
  month?: string;
}

export class RevenueItemDto {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
}

export class RevenueReportResponseDto {
  month: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  revenueItems: RevenueItemDto[];
  expenseItems: RevenueItemDto[];
}
```

**File**: `src/report/dto/index.ts`
```typescript
export * from './herd-report.dto';
export * from './inventory-report.dto';
export * from './vaccine-report.dto';
export * from './expense-report.dto';
export * from './revenue-report.dto';
```

### 3.2 Repository

**File**: `src/report/report.repository.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportRepository {
  constructor(private prisma: PrismaService) {}

  // Herd Reports
  async findHerdReportByDate(startDate: Date, endDate: Date) {
    return this.prisma.herd_reports.findFirst({
      where: { created_at: { gte: startDate, lte: endDate } },
    });
  }

  async createHerdReport(date: Date) {
    return this.prisma.herd_reports.create({ data: { created_at: date } });
  }

  async findHerdReportPens(reportId: string, penId?: string) {
    return this.prisma.herd_report_pens.findMany({
      where: { herd_report_id: reportId, ...(penId && { pen_id: penId }) },
      include: { pens: true },
    });
  }

  // Inventory Reports
  async findInventoryReport(startDate: Date, endDate: Date) {
    return this.prisma.inventory_reports.findFirst({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: { inventory_report_items: { include: { materials: true } } },
    });
  }

  // Vaccine Reports
  async findVaccineReport(startDate: Date, endDate: Date, vaccineId?: string) {
    return this.prisma.vaccine_reports.findFirst({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: {
        vaccine_report_details: {
          include: { vaccines: true, diseases: true },
          ...(vaccineId && { where: { vaccine_id: vaccineId } }),
        },
      },
    });
  }

  // Expenses
  async findExpenses(startDate: Date, endDate: Date, category?: string, status?: string) {
    const where: any = { created_at: { gte: startDate, lte: endDate } };
    if (category) where.expense_categories = { name: category };
    if (status && status !== 'all') where.payment_status = status;

    return this.prisma.expenses.findMany({
      where,
      include: { expense_categories: true, expense_entities: true },
      orderBy: { created_at: 'desc' },
    });
  }

  // Revenue (Shippings)
  async findShippings(startDate: Date, endDate: Date) {
    return this.prisma.pig_shippings.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: { pig_shipping_details: true },
    });
  }
}
```

### 3.3 Service

**File**: `src/report/report.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { ReportRepository } from './report.repository';

@Injectable()
export class ReportService {
  constructor(private repo: ReportRepository) {}

  async getHerdReport(query: { date?: string; pen?: string }) {
    const targetDate = query.date ? new Date(query.date) : new Date();
    const startDate = new Date(targetDate); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate); endDate.setHours(23, 59, 59, 999);

    let report = await this.repo.findHerdReportByDate(startDate, endDate);
    if (!report) report = await this.repo.createHerdReport(targetDate);

    const penStats = await this.repo.findHerdReportPens(report.id, query.pen);
    const pens = penStats.map(s => ({
      penId: s.pen_id || '',
      penName: s.pens?.pen_name || '',
      healthyCount: s.healthy_count || 0,
      sickCount: s.sick_count || 0,
      deadCount: s.dead_count || 0,
      shippedCount: s.shipped_count || 0,
    }));

    return {
      date: targetDate.toISOString().split('T')[0],
      totalPigs: pens.reduce((sum, p) => sum + p.healthyCount + p.sickCount, 0),
      pens,
    };
  }

  async getInventoryReport(query: { month?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const report = await this.repo.findInventoryReport(startDate, endDate);
    const items = report?.inventory_report_items.map(i => ({
      materialId: i.material_id || '',
      materialName: i.materials?.name || '',
      openingStock: i.opening_stock || 0,
      changeAmount: i.change_amout || 0,
      closingStock: i.closing_stock || 0,
    })) || [];

    return { month: targetMonth, items, trends: [] };
  }

  async getVaccineReport(query: { month?: string; vaccine?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const report = await this.repo.findVaccineReport(startDate, endDate, query.vaccine);
    const details = report?.vaccine_report_details.map(d => ({
      vaccineId: d.vaccine_id || '',
      vaccineName: d.vaccines?.vaccine_name || '',
      diseaseName: d.diseases?.name || '',
      cost: Number(d.cost) || 0,
      totalVaccinated: d.total_vaccinated || 0,
      sickCount: 0,
      effectivenessRate: d.effectiveness_rate || 0,
    })) || [];

    return {
      month: targetMonth,
      totalCost: details.reduce((s, d) => s + d.cost, 0),
      totalPigs: details.reduce((s, d) => s + d.totalVaccinated, 0),
      totalSick: 0,
      avgEffectiveness: details.length ? details.reduce((s, d) => s + d.effectivenessRate, 0) / details.length : 0,
      details,
    };
  }

  async getExpenseReport(query: { month?: string; category?: string; status?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenses = await this.repo.findExpenses(startDate, endDate, query.category, query.status);
    const items = expenses.map(e => ({
      id: e.id,
      receiptCode: '',
      date: e.created_at.toISOString().split('T')[0],
      category: e.expense_categories?.name || '',
      amount: Number(e.amount) || 0,
      paymentStatus: e.payment_status || 'unpaid',
    }));

    const total = items.reduce((s, e) => s + e.amount, 0);
    const paid = items.filter(e => e.paymentStatus === 'paid').reduce((s, e) => s + e.amount, 0);

    return { month: targetMonth, totalExpense: total, paidExpense: paid, unpaidExpense: total - paid, expenses: items };
  }

  async getRevenueReport(query: { month?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const shippings = await this.repo.findShippings(startDate, endDate);
    const revenueItems = shippings.map(s => ({
      id: s.id,
      date: s.created_at.toISOString().split('T')[0],
      description: `Shipping to ${s.customer_name}`,
      amount: Number(s.total_amount) || 0,
      type: 'revenue' as const,
    }));

    const expenses = await this.repo.findExpenses(startDate, endDate);
    const expenseItems = expenses.map(e => ({
      id: e.id,
      date: e.created_at.toISOString().split('T')[0],
      description: e.expense_categories?.name || 'Expense',
      amount: Number(e.amount) || 0,
      type: 'expense' as const,
    }));

    const totalRevenue = revenueItems.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expenseItems.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpense;

    return {
      month: targetMonth,
      totalRevenue,
      totalExpense,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      revenueItems,
      expenseItems,
    };
  }
}
```

### 3.4 Controller

**File**: `src/report/report.controller.ts`
```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import {
  HerdReportQueryDto,
  InventoryReportQueryDto,
  VaccineReportQueryDto,
  ExpenseReportQueryDto,
  RevenueReportQueryDto,
} from './dto';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('herd')
  getHerdReport(@Query() query: HerdReportQueryDto) {
    return this.reportService.getHerdReport(query);
  }

  @Get('inventory')
  getInventoryReport(@Query() query: InventoryReportQueryDto) {
    return this.reportService.getInventoryReport(query);
  }

  @Get('vaccines')
  getVaccineReport(@Query() query: VaccineReportQueryDto) {
    return this.reportService.getVaccineReport(query);
  }

  @Get('expenses')
  getExpenseReport(@Query() query: ExpenseReportQueryDto) {
    return this.reportService.getExpenseReport(query);
  }

  @Get('revenue')
  getRevenueReport(@Query() query: RevenueReportQueryDto) {
    return this.reportService.getRevenueReport(query);
  }
}
```

### 3.5 Module

**File**: `src/report/report.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportRepository } from './report.repository';

@Module({
  controllers: [ReportController],
  providers: [ReportService, ReportRepository],
})
export class ReportModule {}
```

---

## API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /work/tasks | List tasks |
| GET | /work/tasks/:id | Get task |
| POST | /work/tasks | Create task |
| PUT | /work/tasks/:id | Update task |
| DELETE | /work/tasks/:id | Delete task |
| GET | /work/employees | List employees |
| GET | /work/pens | List pens |
| GET | /report/herd | Herd report |
| GET | /report/inventory | Inventory report |
| GET | /report/vaccines | Vaccine report |
| GET | /report/expenses | Expense report |
| GET | /report/revenue | Revenue report |

---

## Checklist

- [ ] Phase 0: Run migrations
- [ ] Phase 1: Install deps, create Prisma module, update main.ts
- [ ] Phase 2: Create Work DTOs, Repository, Service, Controller, Module
- [ ] Phase 3: Create Report DTOs, Repository, Service, Controller, Module
- [ ] Test all endpoints
