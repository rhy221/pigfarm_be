import { IsOptional, IsString } from 'class-validator';

export class RevenueReportQueryDto {
  @IsOptional()
  @IsString()
  month?: string;
}

export class RevenueItemDto {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
}

export class RevenueReportResponseDto {
  month: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  revenueItems: RevenueItemDto[];
  expenseItems: RevenueItemDto[];
}
