import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { TaskStatus } from './create-task.dto';

export class QueryTaskDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
