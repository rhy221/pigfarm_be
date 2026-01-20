import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsArray, IsOptional, IsUUID, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
export class PigDashboardStatsDto {
  @ApiProperty({ example: 1240 })
  totalPigs: number;

  @ApiProperty({ example: 18 })
  activePens: number;

  @ApiProperty({ example: 3 })
  overheatedPens: number;

  @ApiProperty({ example: 2 })
  highHumidityPens: number;

  @ApiProperty({ example: 86 })
  newPigs7Days: number;
}

export class PenItemDto {
  @ApiProperty({ example: 'uuid-123' })
  id: string;

  @ApiProperty({ example: 'Chuồng A1' })
  name: string;

  @ApiProperty({ example: 80 })
  currentPigs: number;

  @ApiProperty({ example: 100 })
  capacity: number;

  @ApiProperty({ example: 32.5 })
  temperature: number;

  @ApiProperty({ example: 78.0 })
  humidity: number;

  @ApiProperty({ example: 'warning', enum: ['normal', 'warning', 'danger'] })
  status: string;

  @ApiProperty({ example: 'Cảnh báo' })
  statusLabel: string;

  @ApiProperty({ example: 'orange' })
  color: string;
}

export class ImportPigBatchDto {
  @ApiProperty({ 
    example: 'uuid-lua-cu-neu-co', 
    description: 'ID lứa cũ (Nếu chọn lứa có sẵn). Nếu để trống sẽ tạo lứa mới.',
    required: false 
  })
  @IsOptional()
  @IsUUID()
  existingBatchId?: string; 

  @ApiProperty({ 
    example: 'Lứa nhập ngày 20/01/2026', 
    description: 'Tên lứa mới (Chỉ dùng khi KHÔNG chọn existingBatchId)',
    required: false 
  })
  @IsOptional()
  @IsString()
  batchName?: string;

  @ApiProperty({ example: 'uuid-chuong-a1' })
  @IsUUID()
  penId: string;

  @ApiProperty({ example: 'uuid-giong-heo' })
  @IsUUID()
  breedId: string;

  @ApiProperty({ example: '2026-01-20' })
  @IsDateString()
  arrivalDate: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 21, required: false })
  @IsOptional()
  @IsNumber()
  daysOld?: number;

  @ApiProperty({ example: ['uuid-vaccine-1'] })
  @IsArray()
  @IsOptional()
  vaccineIds?: string[];
}

class PigDetailItem {
  @ApiProperty({ example: '83921023', description: 'ID heo (Mã hệ thống 8 số)' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'TAI-001', description: 'Mã tai' })
  @IsString()
  earTag: string;

  @ApiProperty({ example: 12.5, description: 'Trọng lượng nhập' })
  @IsNumber()
  weight: number;
}

export class UpdatePigListDto {
  @ApiProperty({ type: [PigDetailItem], description: 'Danh sách heo cần cập nhật thông tin' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PigDetailItem)
  items: PigDetailItem[];
}

export class PigResponseDto {
  @ApiProperty({ example: '83921023', description: 'Mã hệ thống tự sinh (8 số)' })
  id: string;

  @ApiProperty({ example: 'uuid-chuong-a1' })
  pen_id: string;

  @ApiProperty({ example: 'uuid-giong-heo' })
  pig_breed_id: string;

  @ApiProperty({ example: 'uuid-lua-heo' })
  pig_batch_id: string;

  @ApiProperty({ example: '', description: 'Mã tai (Chưa nhập)' })
  ear_tag_number: string;

  @ApiProperty({ example: 0, description: 'Cân nặng (Chưa nhập)' })
  weight: number;
}

export class PigBatchResponseDto {
  @ApiProperty({ example: 'uuid-lua-heo' })
  id: string;

  @ApiProperty({ example: 'Lứa nhập ngày 20/01/2026' })
  batch_name: string;

  @ApiProperty({ example: '2026-01-20T00:00:00.000Z' })
  arrival_date: Date;
}

export class ImportBatchResponseDto {
  @ApiProperty({ example: 'Nhập lứa thành công' })
  message: string;

  @ApiProperty({ type: PigBatchResponseDto })
  batch: PigBatchResponseDto;

  @ApiProperty({ type: [PigResponseDto], description: 'Danh sách heo vừa tạo để nhập liệu chi tiết' })
  pigs: PigResponseDto[];
}

export class TransferPigDto {
  @ApiProperty({ 
    example: ['pig-uuid-1', 'pig-uuid-2'], 
    description: 'Danh sách ID các con heo cần chuyển' 
  })
  @IsArray()
  @IsUUID('4', { each: true })
  pigIds: string[];

  @ApiProperty({ 
    example: 'uuid-chuong-moi', 
    description: 'ID chuồng đích (Nơi chuyển tới)' 
  })
  @IsUUID()
  targetPenId: string;

  @ApiProperty({ 
    example: false, 
    description: 'Tick chọn nếu đây là chuyển sang chuồng cách ly (Heo bệnh)' 
  })
  @IsBoolean()
  isIsolation: boolean;

  @ApiProperty({ 
    required: false, 
    example: '2026-01-20', 
    description: 'Ngày phát hiện bệnh (Bắt buộc nếu là cách ly)' 
  })
  @IsOptional()
  @IsDateString()
  diseaseDate?: string;

  @ApiProperty({ 
    required: false, 
    example: 'uuid-loai-benh', 
    description: 'ID loại bệnh (Bắt buộc nếu là cách ly)' 
  })
  @IsOptional()
  @IsUUID()
  diseaseId?: string;

  @ApiProperty({ 
    required: false, 
    example: 'Ho khan, bỏ ăn', 
    description: 'Triệu chứng ban đầu (Bắt buộc nếu là cách ly)' 
  })
  @IsOptional()
  @IsString()
  symptoms?: string;
}