import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PenVaccinationStatusDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  scheduleId: string;

  @ApiProperty({ example: 'Chuồng A1' })
  penName: string;

  @ApiProperty({ example: 'pending', enum: ['pending', 'completed'] })
  status: string;

  @ApiProperty({ example: false, description: 'True nếu status là completed' })
  isDone: boolean;
}

export class DailyVaccinationDetailDto {
  @ApiProperty({ example: 'Dịch tả heo cổ điển' })
  vaccineName: string;

  @ApiProperty({ example: 1, description: 'Mũi tiêm số mấy' })
  stage: number;

  @ApiProperty({ example: 5, description: 'Tổng số chuồng cần tiêm loại này' })
  totalPens: number;

  @ApiProperty({ type: [PenVaccinationStatusDto] })
  pens: PenVaccinationStatusDto[];
}

export class VaccinationActionItem {
  @ApiProperty({ description: 'True nếu là lịch đã có trong DB, False nếu là lịch dự kiến' })
  @IsBoolean()
  isReal: boolean;

  @ApiProperty({ description: 'ID lịch tiêm (Bắt buộc nếu isReal = true)', required: false })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiProperty({ description: 'ID của mẫu tiêm (để lấy thông tin vaccine/liều)', required: false })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ description: 'ID chuồng (nếu là lịch dự kiến)', required: false })
  @IsOptional()
  @IsUUID()
  penId?: string;
}

export class MarkVaccinatedDto {
  @ApiProperty({
    description: 'Danh sách các item cần đánh dấu hoàn thành',
    type: [VaccinationActionItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VaccinationActionItem)
  items: VaccinationActionItem[];
}

export class CreateManualScheduleDto {
  @ApiProperty({ description: 'Danh sách ID các chuồng được chọn', example: ['uuid-pen-1', 'uuid-pen-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  penIds: string[];

  @ApiProperty({ description: 'Ngày và giờ tiêm', example: '2025-10-20T08:30:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiProperty({ description: 'ID vắc-xin (nếu chọn từ hệ thống)', required: false })
  @IsOptional()
  @IsUUID()
  vaccineId?: string;

  @ApiProperty({ description: 'Tên vắc-xin (nếu nhập thủ công)', required: false })
  @IsOptional()
  @IsString()
  vaccineName?: string;

  @ApiProperty({ description: 'Số mũi', example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  stage: number;

  @ApiProperty({ description: 'Mã màu Hex', example: '#FF5733', required: false })
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateScheduleDto {
  @ApiProperty({ description: 'Cập nhật ngày giờ tiêm', required: false })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({ description: 'ID vắc-xin (nếu muốn đổi loại khác)', required: false })
  @IsOptional()
  @IsUUID()
  vaccineId?: string;

  @ApiProperty({ description: 'Tên vắc-xin (nếu nhập tay mới)', required: false })
  @IsOptional()
  @IsString()
  vaccineName?: string;

  @ApiProperty({ description: 'Cập nhật số mũi', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  stage?: number;

  @ApiProperty({ description: 'Cập nhật màu sắc', required: false })
  @IsOptional()
  @IsString()
  color?: string;
}