import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  NIGHT = 'night',
}

export enum TaskType {
  FEEDING = 'feeding',
  CLEANING = 'cleaning',
  HEALTH_CHECK = 'health_check',
  VACCINATION = 'vaccination',
  MONITORING = 'monitoring',
  OTHER = 'other',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateTaskDto {
  @IsDateString()
  date: string;

  @IsEnum(ShiftType)
  shift: ShiftType;

  @IsUUID()
  barnId: string;

  @IsUUID()
  userId: string;

  @IsEnum(TaskType)
  taskType: TaskType;

  @IsString()
  taskDescription: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
