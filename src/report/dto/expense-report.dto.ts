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
  receiptCode: string;
  date: string;
  category: string;
  amount: number;
  paymentStatus: string;
}

export class ExpenseReportResponseDto {
  month: string;
  totalExpense: number;
  paidExpense: number;
  unpaidExpense: number;
  expenses: ExpenseItemDto[];
}
