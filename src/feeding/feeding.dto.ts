import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsArray, ValidateNested, IsNumber, Max } from 'class-validator';
import { Type } from 'class-transformer';
// ========================================================
// 1. DTO CHO REQUEST BODY (Gửi lên để tạo mới)
// ========================================================

export class FormulaIngredientItemDto {
  @ApiProperty({ description: 'ID của sản phẩm trong kho (Inventory Product ID)' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Tỷ lệ phần trăm (%) hoặc khối lượng' })
  @IsNumber()
  @Min(0)
  percentage: number; 
}

export class CreateFeedingFormulaDto {
  @ApiProperty({ example: 'Cám heo sữa A1', description: 'Tên hiển thị của công thức' })
  @IsString()
  @IsNotEmpty()
  name: string;


  @ApiProperty({ example: 0, description: 'Áp dụng từ ngày tuổi thứ bao nhiêu' })
  @IsInt()
  @Min(0)
  startDay: number;

  @ApiProperty({ example: 200, description: 'Định lượng cho ăn (gram/con/ngày)' })
  @IsInt()
  @Min(0)
  amountPerPig: number;

  @ApiProperty({ type: [FormulaIngredientItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaIngredientItemDto)
  items: FormulaIngredientItemDto[];
}

export class FeedingFormulaResponseDto {
  @ApiProperty({ example: 'uuid-123-456' })
  id: string;

  @ApiProperty({ example: 'Cám heo sữa A1' })
  name: string;

  @ApiProperty({ example: 0 })
  start_day: number;


  @ApiProperty({ example: 200 })
  amount_per_pig: number;

  @ApiProperty({ example: '50% Cám - 50% Bột cá' })
  ingredients: string;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00Z' })
  created_at: Date;
}

// DTO cho phần Timeline (giữ nguyên)
export class TimelineStageDto {
  @ApiProperty({ example: 'uuid-formula-1' })
  id: string; 

  @ApiProperty({ example: '0 - 30 ngày' })
  desc: string;

  @ApiProperty({ example: 0 })
  startDay: number;

  @ApiProperty({ example: 30 })
  endDay: number;

  @ApiProperty({ example: true })
  isCurrent: boolean;

  @ApiProperty({ example: 'past', enum: ['past', 'current', 'future'] })
  status: string; 
}

// DTO cho phần chi tiết bảng (giữ nguyên)
export class FeedingPlanItemDto {
  @ApiProperty({ example: 'Chuồng A1' })
  penName: string;

  @ApiProperty({ example: 'Cám heo sữa A1' })
  formulaName: string;

  @ApiProperty({ example: '50% Cám - 50% Bột cá' })
  ingredients: string;

  @ApiProperty({ example: 50 })
  pigCount: number;

  @ApiProperty({ example: 200 })
  amountPerPig: number;

  @ApiProperty({ example: '10.0 kg' })
  totalAmountLabel: string;
}

export class FeedingPlanResponseDto {
  @ApiProperty({ type: [TimelineStageDto], description: 'Danh sách các mốc thời gian' })
  timeline: TimelineStageDto[];

  @ApiProperty({ type: [FeedingPlanItemDto], description: 'Danh sách chi tiết tính toán cho từng chuồng' })
  details: FeedingPlanItemDto[];
}

export class UpdateFeedingFormulaDto extends PartialType(CreateFeedingFormulaDto) {}