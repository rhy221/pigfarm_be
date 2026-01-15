import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MarkVaccinatedDto {
  @ApiProperty({
    description: 'Danh sách các ID lịch tiêm cần đánh dấu hoàn thành',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true }) 
  scheduleIds: string[];
}

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

export class CalendarEventItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Suyễn heo' })
  name: string;

  @ApiProperty({ example: 'pending' })
  status: string;
}