import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class HerdReportQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  pen?: string;

  @IsOptional()
  @IsUUID()
  batch?: string;
}

export class PenStatDto {
  penId: string;
  penName: string;
  healthyCount: number;
  sickCount: number;
  deadCount: number;
  shippedCount: number;
}

export class HerdReportResponseDto {
  date: string;
  totalPigs: number;
  pens: PenStatDto[];
}
