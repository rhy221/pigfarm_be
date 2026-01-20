import { IsOptional, IsString } from 'class-validator';

export class InventoryReportQueryDto {
  @IsOptional()
  @IsString()
  month?: string; // Format: YYYY-MM

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class InventoryItemDto {
  productId: string;
  productName: string;
  productCode: string;
  openingStock: number;
  receivedQuantity: number;
  issuedQuantity: number; // Đây là "dùng"
  closingStock: number;
  avgCost: number;
  totalValue: number;
}

export class InventoryReportResponseDto {
  month: string;
  warehouseId?: string;
  warehouseName?: string;
  items: InventoryItemDto[];
  trends: { month: string; value: number }[];
}
