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

  @IsOptional()
  @IsEnum(['income', 'expense', 'all'])
  type?: string; // Thêm filter theo loại giao dịch
}

export class TransactionItemDto {
  id: string;
  transactionCode: string;
  date: string;
  category: string;
  amount: number;
  type: 'income' | 'expense'; // Thu hoặc chi
  status: string;
  isRecorded: boolean; // Đã ghi sổ chưa
  description?: string;
  contactName?: string;
}

export class ExpenseReportResponseDto {
  month: string;
  // Thống kê chi
  totalExpense: number;
  recordedExpense: number; // Chi đã ghi sổ
  unrecordedExpense: number; // Chi chưa ghi sổ
  // Thống kê thu
  totalIncome: number;
  recordedIncome: number; // Thu đã ghi sổ
  unrecordedIncome: number; // Thu chưa ghi sổ
  // Tổng hợp
  netAmount: number; // Thu ròng = Thu - Chi
  transactions: TransactionItemDto[];
}
