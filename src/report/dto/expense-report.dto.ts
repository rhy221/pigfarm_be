import { IsOptional, IsString, IsEnum } from 'class-validator';

export class ExpenseReportQueryDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['paid', 'unpaid', 'all'])
  status?: string;
}

export class ExpenseItemDto {
  id: string;
  transactionCode: string;
  date: string;
  category: string;
  amount: number;
  status: string;
  description?: string;
  contactName?: string;
}

export class ExpenseReportResponseDto {
  month: string;
  totalExpense: number;
  paidExpense: number;
  unpaidExpense: number;
  expenses: ExpenseItemDto[];
}
