// =====================================================
// INVENTORY MODULE - DTOs
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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ============ ENUMS ============
export enum WarehouseType {
  MAIN = 'main',
  SUB = 'sub',
  HARVEST = 'harvest',
}

export enum CategoryType {
  FEED = 'feed',
  MEDICINE = 'medicine',
  EQUIPMENT = 'equipment',
  HARVEST = 'harvest',
  OTHER = 'other',
}

export enum ReceiptType {
  PURCHASE = 'purchase',
  RETURN = 'return',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
}

export enum IssueType {
  USAGE = 'usage',
  SALE = 'sale',
  TRANSFER = 'transfer',
  DISPOSAL = 'disposal',
  RETURN = 'return',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

// ============ WAREHOUSE DTOs ============
export class CreateWarehouseDto {
  @ApiProperty({ description: 'Tên kho' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Vị trí kho' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: WarehouseType, description: 'Loại kho' })
  @IsEnum(WarehouseType)
  warehouseType: WarehouseType;

  @ApiPropertyOptional({ description: 'Đặt làm kho mặc định', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}

// ============ WAREHOUSE CATEGORY DTOs ============
export class CreateWarehouseCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: CategoryType })
  @IsEnum(CategoryType)
  type: CategoryType;
}

export class UpdateWarehouseCategoryDto extends PartialType(
  CreateWarehouseCategoryDto,
) {}

// ============ UNIT DTOs ============
export class CreateUnitDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  abbreviation?: string;
}

export class UpdateUnitDto extends PartialType(CreateUnitDto) {}

// ============ PRODUCT DTOs ============
export class CreateProductDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

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
  description?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  minQuantity?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultPrice?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  barcode?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

// ============ SUPPLIER DTOs ============
export class CreateSupplierDto {
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankAccount?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

// ============ STOCK RECEIPT DTOs ============
export class StockReceiptItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateStockReceiptDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiProperty()
  @IsDateString()
  receiptDate: string;

  @ApiPropertyOptional({ enum: ReceiptType })
  @IsEnum(ReceiptType)
  @IsOptional()
  receiptType?: ReceiptType;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  shippingFee?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  paidAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @ApiProperty({ type: [StockReceiptItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockReceiptItemDto)
  items: StockReceiptItemDto[];
}

export class UpdateStockReceiptDto extends PartialType(CreateStockReceiptDto) {}

export class ConfirmStockReceiptDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  approvedById?: string;
}

// ============ STOCK ISSUE DTOs ============
export class StockIssueItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'ID của lô hàng (inventory_batch) để xuất' })
  @IsUUID()
  @IsOptional()
  batchId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateStockIssueDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({ enum: IssueType })
  @IsEnum(IssueType)
  @IsOptional()
  issueType?: IssueType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  pigBatchId?: string;

  @ApiProperty({ type: [StockIssueItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockIssueItemDto)
  items: StockIssueItemDto[];
}

export class UpdateStockIssueDto extends PartialType(CreateStockIssueDto) {}

// ============ INVENTORY CHECK DTOs ============
export class InventoryCheckItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  actualQuantity: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateInventoryCheckDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsDateString()
  checkDate: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [InventoryCheckItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCheckItemDto)
  items: InventoryCheckItemDto[];
}

// ============ QUERY DTOs ============
export class InventoryQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

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

export class StockReceiptQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

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

export class StockIssueQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: IssueType })
  @IsEnum(IssueType)
  @IsOptional()
  issueType?: IssueType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

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

export class InventoryHistoryQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  productId?: string;

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
  transactionType?: 'in' | 'out' | 'adjustment';

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

// ============ EXPIRY & BATCH ENUMS ============
export enum BatchStatus {
  ACTIVE = 'active',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  DISPOSED = 'disposed',
}

export enum ExpiryStatus {
  NO_EXPIRY = 'no_expiry',
  GOOD = 'good',
  NOTICE = 'notice', // 90 days
  WARNING = 'warning', // 30 days
  CRITICAL = 'critical', // 7 days
  EXPIRED = 'expired',
}

// ============ EXPIRY ALERT DTOs ============
export class ExpiryAlertQueryDto {
  @ApiPropertyOptional({ enum: ExpiryStatus })
  @IsEnum(ExpiryStatus)
  @IsOptional()
  expiryStatus?: ExpiryStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  productId?: string;

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

export class DisposeBatchDto {
  @ApiProperty()
  @IsUUID()
  batchId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ExpirySummaryResponseDto {
  @ApiProperty()
  expiredCount: number;

  @ApiProperty()
  criticalCount: number;

  @ApiProperty()
  warningCount: number;

  @ApiProperty()
  noticeCount: number;

  @ApiProperty()
  expiredValue: number;

  @ApiProperty()
  criticalValue: number;

  @ApiProperty()
  warningValue: number;

  @ApiProperty()
  totalAlerts: number;
}

export class ExpiryAlertResponseDto {
  @ApiProperty()
  batchId: string;

  @ApiProperty()
  warehouseId: string;

  @ApiProperty()
  warehouseName: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productCode: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  categoryName: string;

  @ApiProperty()
  unitName: string;

  @ApiProperty()
  batchNumber: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitCost: number;

  @ApiProperty()
  totalValue: number;

  @ApiProperty()
  manufacturingDate: Date;

  @ApiProperty()
  expiryDate: Date;

  @ApiProperty()
  receivedDate: Date;

  @ApiProperty()
  daysUntilExpiry: number;

  @ApiProperty({ enum: ExpiryStatus })
  expiryStatus: ExpiryStatus;
}
