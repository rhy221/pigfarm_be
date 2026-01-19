import { IsString, IsArray, IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';

export enum PigStatus {
  SICK = 'SICK',
  RECOVERED = 'RECOVERED',
  DEAD = 'DEAD'
}

export class CreateTreatmentDto {
  @IsUUID()
  pen_id: string;

  @IsUUID()
  disease_id: string;

  @IsOptional()
  @IsString()
  symptom?: string;

  @IsArray()
  @IsString({ each: true })
  pig_ids: string[];
}

export class AddTreatmentLogDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  medicine?: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  condition?: string;
}

export class UpdatePigsStatusDto {
  @IsArray()
  @IsString({ each: true })
  pig_ids: string[];

  @IsOptional()
  @IsEnum(PigStatus)
  status?: PigStatus;

  @IsOptional()
  @IsString()
  target_pen_id?: string;
}