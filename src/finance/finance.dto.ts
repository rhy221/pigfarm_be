// =====================================================
// FINANCE MODULE - DTOs (Quản lý chi phí / Sổ quỹ)
// =====================================================

import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ============ ENUMS ============
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum AccountType {
  CASH = 'cash',
  BANK = 'bank',
}

export enum ContactType {
  SUPPLIER = 'supplier',
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  OTHER = 'other',
}

export enum ReferenceType {
  STOCK_RECEIPT = 'stock_receipt',
  STOCK_ISSUE = 'stock_issue',
  SALARY = 'salary',
  INVOICE = 'invoice',
  OTHER = 'other',
}

export enum BillStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

// ============ TRANSACTION CATEGORY DTOs ============
export class CreateTransactionCategoryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateTransactionCategoryDto extends PartialType(
  CreateTransactionCategoryDto,
) {}

// ============ CASH ACCOUNT DTOs ============
export class CreateCashAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: AccountType })
  @IsEnum(AccountType)
  @IsOptional()
  accountType?: AccountType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  currentBalance?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateCashAccountDto extends PartialType(CreateCashAccountDto) {}

// ============ TRANSACTION DTOs ============
export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  cashAccountId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty()
  @IsDateString()
  transactionDate: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ enum: ContactType })
  @IsEnum(ContactType)
  @IsOptional()
  contactType?: ContactType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ enum: ReferenceType })
  @IsEnum(ReferenceType)
  @IsOptional()
  referenceType?: ReferenceType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRecorded?: boolean;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

// ============ SUPPLIER PAYMENT DTOs ============
export class CreateSupplierPaymentDto {
  @ApiProperty()
  @IsUUID()
  supplierId: string;

  @ApiProperty()
  @IsUUID()
  cashAccountId: string;

  @ApiProperty()
  @IsDateString()
  paymentDate: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

// ============ PIG SALE COLLECTION DTOs ============
export class CreatePigSaleCollectionDto {
  @ApiPropertyOptional({ description: 'ID khách hàng (nếu có)' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Tên khách hàng (nếu không có customerId)' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ description: 'ID phiếu xuất heo (pig_shippings)' })
  @IsUUID()
  @IsOptional()
  pigShippingId?: string;

  @ApiProperty({ description: 'ID tài khoản thu' })
  @IsUUID()
  cashAccountId: string;

  @ApiProperty({ description: 'Ngày thu' })
  @IsDateString()
  collectionDate: string;

  @ApiProperty({ description: 'Số tiền thu' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// ============ MONTHLY BILL DTOs ============
export class CreateMonthlyBillDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  defaultAmount?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  dueDay?: number;
}

export class UpdateMonthlyBillDto extends PartialType(CreateMonthlyBillDto) {}

export class CreateMonthlyBillRecordDto {
  @ApiProperty()
  @IsUUID()
  billId: string;

  @ApiProperty()
  @IsInt()
  periodMonth: number;

  @ApiProperty()
  @IsInt()
  periodYear: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class PayMonthlyBillDto {
  @ApiProperty()
  @IsUUID()
  recordId: string;

  @ApiProperty()
  @IsUUID()
  cashAccountId: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

// DTO để thanh toán trực tiếp từ bill (tự động tạo record nếu chưa có)
export class PayBillDirectDto {
  @ApiProperty({ description: 'ID của monthly bill' })
  @IsUUID()
  billId: string;

  @ApiProperty({ description: 'Tháng thanh toán (1-12)' })
  @IsInt()
  @Min(1)
  periodMonth: number;

  @ApiProperty({ description: 'Năm thanh toán' })
  @IsInt()
  periodYear: number;

  @ApiProperty({ description: 'Số tiền thanh toán' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'ID tài khoản thanh toán' })
  @IsUUID()
  cashAccountId: string;

  @ApiProperty({ description: 'Ngày thanh toán' })
  @IsDateString()
  paidDate: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

// ============ CUSTOMER DTOs ============
export class CreateCustomerDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxCode?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

// ============ QUERY DTOs ============
export class TransactionQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  cashAccountId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsEnum(TransactionType)
  @IsOptional()
  transactionType?: TransactionType;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isRecorded?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class CashBookReportDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  cashAccountId?: string;

  @ApiProperty()
  @IsDateString()
  fromDate: string;

  @ApiProperty()
  @IsDateString()
  toDate: string;
}

export class FinancialSummaryDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  month?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  toDate?: string;
}

export class MonthlyBillQueryDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  month?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ enum: BillStatus })
  @IsEnum(BillStatus)
  @IsOptional()
  status?: BillStatus;
}
