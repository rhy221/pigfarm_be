import { 
  IsString, 
  IsArray, 
  IsOptional, 
  IsNumber, 
  IsDateString, 
  ValidateNested, 
  Min,
  IsNotEmpty 
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalesDetailDto {
  @IsString()
  @IsNotEmpty({ message: 'ID chuồng không được để trống' })
  pen_id: string;

  @IsNumber({}, { message: 'Tổng trọng lượng phải là con số' })
  @Min(0, { message: 'Trọng lượng không được âm' }) 
  total_weight: number;

  @IsNumber({}, { message: 'Đơn giá phải là con số' })
  @Min(0, { message: 'Đơn giá không được âm' })
  unit_price: number;

  @IsArray({ message: 'Danh sách ID heo phải là một mảng' })
  @IsString({ each: true, message: 'ID mỗi con heo phải là chuỗi' })
  pig_ids: string[];
}

export class CreateSalesDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã đợt xuất không được để trống' })
  receipt_code: string;

  @IsDateString({}, { message: 'Ngày xuất không đúng định dạng ngày tháng' })
  export_date: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên khách hàng không được để trống' })
  customer_name: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  full_address?: string;

  @IsArray({ message: 'Chi tiết phiếu xuất phải là một mảng' })
  @ValidateNested({ each: true }) 
  @Type(() => SalesDetailDto)    
  details: SalesDetailDto[];
}