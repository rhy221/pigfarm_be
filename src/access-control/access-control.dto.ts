import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class UpdatePermissionDto {
  @IsNotEmpty()
  @IsString()
  moduleKey: string;

  @IsNotEmpty()
  @IsBoolean()
  value: boolean;
}