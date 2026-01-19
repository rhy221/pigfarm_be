import { IsEmail, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password_hash: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsNumber()
  role_id: number;
}