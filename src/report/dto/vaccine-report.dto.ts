import { IsOptional, IsString, IsUUID } from 'class-validator';

export class VaccineReportQueryDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsUUID()
  vaccine?: string;
}

export class VaccineDetailDto {
  vaccineId: string;
  vaccineName: string;
  diseaseName: string;
  cost: number;
  totalVaccinated: number;
  sickCount: number;
  effectivenessRate: number;
}

export class VaccineReportResponseDto {
  month: string;
  totalCost: number;
  totalPigs: number;
  totalSick: number;
  avgEffectiveness: number;
  details: VaccineDetailDto[];
}
