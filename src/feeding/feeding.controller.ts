import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

// ========================================================
// 1. DTO CHO REQUEST BODY (Gửi lên để tạo mới)
// ========================================================
export class CreateFeedingFormulaDto {
  @ApiProperty({ example: 'Cám heo sữa A1', description: 'Tên hiển thị của công thức' })
  @IsString()
  @IsNotEmpty()
  name: string;

  
  @ApiProperty({ example: 0, description: 'Ngày bắt đầu giai đoạn (tính theo ngày tuổi)' })
  @IsInt()
  @Min(0)
  startDay: number;

  @ApiProperty({ example: 200, description: 'Định lượng cho ăn (gram/con/ngày)' })
  @IsInt()
  @Min(0)
  amountPerPig: number;

  @ApiProperty({ example: '50% Cám - 50% Bột cá', required: false, description: 'Thành phần chi tiết' })
  @IsOptional()
  @IsString()
  ingredients?: string;
}
export class UpdateFeedingFormulaDto extends PartialType(CreateFeedingFormulaDto) {}


// ========================================================
// 3. DTO RESPONSE
// ========================================================
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

// DTO cho phần Timeline
export class TimelineStageDto {
  @ApiProperty({ example: 'Tháng 1' })
  label: string; 

  @ApiProperty({ example: '0 - 29 ngày' })
  desc: string; 

  @ApiProperty({ example: 0 })
  startDay: number;

  @ApiProperty({ example: 29 })
  endDay: number;

  @ApiProperty({ example: true })
  isCurrent: boolean;

  @ApiProperty({ example: 'past', enum: ['past', 'current', 'future'] })
  status: string; 
}

// DTO cho phần chi tiết bảng
export class FeedingPlanItemDto {
  @ApiProperty({ example: 'Chuồng A1' })
  penName: string;

  @ApiProperty({ example: 'Cám heo sữa A1' })
  formulaName: string;

  @ApiProperty({ example: '50% Cám - 50% Bột cá' })
  ingredientsText: string;

  @ApiProperty({ example: 50 })
  pigCount: number;

  @ApiProperty({ example: 200 })
  amountPerPig: number;

  @ApiProperty({ example: '10.0 kg' })
  totalFeedAmount: string;

  @ApiProperty({ example: [] })
  ingredients: any[]; 
}

export class FeedingPlanResponseDto {
  @ApiProperty({ type: [TimelineStageDto], description: 'Danh sách các mốc thời gian' })
  timeline: TimelineStageDto[];

  @ApiProperty({ type: [FeedingPlanItemDto], description: 'Danh sách chi tiết tính toán cho từng chuồng' })
  details: FeedingPlanItemDto[];
}