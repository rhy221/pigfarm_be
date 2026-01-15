import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ 
    description: 'ID vaccine (nếu chọn từ danh sách gợi ý)', 
    example: 'uuid-co-san',
    required: false 
  })
  @IsUUID()
  @IsOptional()
  vaccineId?: string;

  @ApiProperty({ 
    description: 'Tên vaccine (Người dùng tự nhập hoặc lấy từ gợi ý)', 
    example: 'Vắc-xin Myco mới' 
  })
  @IsString()
  @IsNotEmpty()
  vaccineName: string;

  @ApiProperty({ description: 'Mũi tiêm số mấy', example: 1 })
  @IsInt()
  @Min(1)
  stage: number;

  @ApiProperty({ description: 'Ngày tuổi cần tiêm', example: 15 })
  @IsInt()
  @Min(0)
  daysOld: number;

  @ApiProperty({ description: 'Liều lượng', example: '1ml/con', required: false })
  @IsString()
  @IsOptional()
  dosage: string;

  @ApiProperty({ description: 'Ghi chú thêm', required: false })
  @IsString()
  @IsOptional()
  notes: string;
}

export class VaccinationTemplateResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Số thứ tự hiển thị', example: 1 })
  stt: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  vaccineId: string;

  @ApiProperty({ description: 'Tên vắc-xin lấy từ bảng vaccines', example: 'Suyễn heo' })
  vaccineName: string;

  @ApiProperty({ example: 1 })
  stage: number;

  @ApiProperty({ description: 'Tên hiển thị đầy đủ', example: 'Suyễn heo - Mũi 1' })
  fullName: string;

  @ApiProperty({ example: '1ml/con' })
  dosage: string;

  @ApiProperty({ example: 15 })
  daysOld: number;

  @ApiProperty({ example: '15 ngày tuổi' })
  daysOldText: string;

  @ApiProperty({ example: 'Lưu ý quan trọng...' })
  notes: string;
}

export class VaccinationSuggestionDto {
  @ApiProperty({ example: 'FMD' })
  code: string;

  @ApiProperty({ example: 'Lở mồm long móng (FMD)' })
  name: string;

  @ApiProperty({ example: 112 })
  daysOld: number;

  @ApiProperty({ example: '2ml/con' })
  dosage: string;

  @ApiProperty({ example: 'Thương lái/kiểm dịch thường yêu cầu nếu xuất đi xa' })
  description: string;

  @ApiProperty({ example: 'green' })
  color: string;
  
  @ApiProperty({ example: 'uuid-cua-vaccine-fmd', description: 'ID vaccine để frontend tự điền' })
  vaccineId: string; 
}