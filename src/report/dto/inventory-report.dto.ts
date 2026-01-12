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
