// =====================================================
// FINANCE MODULE - SERVICE (Quản lý chi phí / Sổ quỹ)
// =====================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransactionCategoryDto,
  UpdateTransactionCategoryDto,
  CreateCashAccountDto,
  UpdateCashAccountDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  CreateSupplierPaymentDto,
  CreateMonthlyBillDto,
  UpdateMonthlyBillDto,
  CreateMonthlyBillRecordDto,
  PayMonthlyBillDto,
  PayBillDirectDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  TransactionQueryDto,
  CashBookReportDto,
  FinancialSummaryDto,
  MonthlyBillQueryDto,
  TransactionType,
} from './finance.dto';
import {NamingUtils} from '../lib/utils';
import { Prisma } from '../generated/prisma/client'
@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ============ HELPER METHODS ============
  private async generateTransactionCode(
    type: TransactionType,
    date: Date,
  ): Promise<string> {
    const prefix = type === TransactionType.INCOME ? 'PT' : 'PC';
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.prisma.transactions.count({
      where: {
        transaction_type: type,
        transaction_date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    return `${prefix}-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  // ============ TRANSACTION CATEGORY METHODS ============
  async createTransactionCategory(dto: CreateTransactionCategoryDto) {
    return this.prisma.transaction_categories.create({ data: NamingUtils.toSnakeCase(dto) });
  }

  async updateTransactionCategory(id: string, dto: UpdateTransactionCategoryDto) {
    return this.prisma.transaction_categories.update({
      where: { id },
      data: NamingUtils.toSnakeCase(dto),
    });
  }

  async deleteTransactionCategory(id: string) {
    const category = await this.prisma.transaction_categories.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    if (category.is_system) {
      throw new BadRequestException('Không thể xóa danh mục hệ thống');
    }
    return this.prisma.transaction_categories.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getTransactionCategories(type?: TransactionType) {
    const where: Prisma.transaction_categoriesWhereInput = {
      is_active: true,
    };
    if (type) where.type = type;

    return this.prisma.transaction_categories.findMany({
      where,
      include: { other_transaction_categories: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  // ============ CASH ACCOUNT METHODS ============
  async createCashAccount(dto: CreateCashAccountDto) {
    if (dto.isDefault) {
      await this.prisma.cash_accounts.updateMany({
        where: { is_default: true },
        data: { is_default: false },
      });
    }
    return this.prisma.cash_accounts.create({
      data: {
        ...NamingUtils.toSnakeCase(dto),
        current_balance: dto.openingBalance || 0,
      },
    });
  }

  async updateCashAccount(id: string, dto: UpdateCashAccountDto) {
    const account = await this.prisma.cash_accounts.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản');

    if (dto.isDefault) {
      await this.prisma.cash_accounts.updateMany({
        where: { is_default: true },
        data: { is_default: false },
      });
    }

    return this.prisma.cash_accounts.update({
      where: { id },
      data: NamingUtils.toSnakeCase(dto),
    });
  }

  async deleteCashAccount(id: string) {
    return this.prisma.cash_accounts.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getCashAccounts() {
    return this.prisma.cash_accounts.findMany({
      where: { is_active: true },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    });
  }

  async getCashAccountById(id: string) {
    const account = await this.prisma.cash_accounts.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản');
    return account;
  }

  // ============ TRANSACTION METHODS ============
  async createTransaction(dto: CreateTransactionDto, createdById?: string) {
    const transactionDate = new Date(dto.transactionDate);
    const transactionCode = await this.generateTransactionCode(
      dto.transactionType,
      transactionDate,
    );

    return this.prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transactions.create({
        data: {
          cash_account_id: dto.cashAccountId,
          category_id: dto.categoryId,
          transaction_code: transactionCode,
          transaction_type: dto.transactionType,
          transaction_date: transactionDate,
          amount: dto.amount,
          contact_type: dto.contactType,
          contact_id: dto.contactId,
          contact_name: dto.contactName,
          reference_type: dto.referenceType,
          reference_id: dto.referenceId,
          description: dto.description,
          notes: dto.notes,
          is_recorded: dto.isRecorded ?? true,
          status: 'confirmed',
          created_by: createdById,
        },
        include: {
          transaction_categories: true,
          cash_accounts: true,
        },
      });

      if (newTransaction.is_recorded) {
        const balanceChange =
          dto.transactionType === TransactionType.INCOME ? dto.amount : -dto.amount;

        await tx.cash_accounts.update({
          where: { id: dto.cashAccountId },
          data: {
            current_balance: { increment: balanceChange },
          },
        });
      }

      return newTransaction;
    });
  }

  async updateTransaction(id: string, dto: UpdateTransactionDto) {
    const transaction = await this.prisma.transactions.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch');

    return this.prisma.$transaction(async (tx) => {
      if (transaction.is_recorded) {
        const oldBalanceChange =
          transaction.transaction_type === 'income'
            ? -Number(transaction.amount)
            : Number(transaction.amount);

        await tx.cash_accounts.update({
          where: { id: transaction.cash_account_id },
          data: { current_balance: { increment: oldBalanceChange } },
        });
      }

      const updatedTransaction = await tx.transactions.update({
        where: { id },
        data: {
          category_id: dto.categoryId,
          transaction_date: dto.transactionDate ? new Date(dto.transactionDate) : undefined,
          amount: dto.amount,
          contact_type: dto.contactType,
          contact_id: dto.contactId,
          contact_name: dto.contactName,
          description: dto.description,
          notes: dto.notes,
          is_recorded: dto.isRecorded,
        },
        include: {
          transaction_categories: true,
          cash_accounts: true,
        },
      });

      const isRecorded = dto.isRecorded ?? updatedTransaction.is_recorded;
      if (isRecorded) {
        const newAmount = dto.amount ?? Number(transaction.amount);
        const type = dto.transactionType ?? transaction.transaction_type;
        const newBalanceChange = type === 'income' ? newAmount : -newAmount;

        await tx.cash_accounts.update({
          where: { id: updatedTransaction.cash_account_id },
          data: { current_balance: { increment: newBalanceChange } },
        });
      }

      return updatedTransaction;
    });
  }

  async deleteTransaction(id: string) {
    const transaction = await this.prisma.transactions.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch');

    return this.prisma.$transaction(async (tx) => {
      if (transaction.is_recorded) {
        const balanceChange =
          transaction.transaction_type === 'income'
            ? -Number(transaction.amount)
            : Number(transaction.amount);

        await tx.cash_accounts.update({
          where: { id: transaction.cash_account_id },
          data: { current_balance: { increment: balanceChange } },
        });
      }

      return tx.transactions.update({
        where: { id },
        data: { status: 'cancelled' },
      });
    });
  }

  async getTransactions(query: TransactionQueryDto) {
    const { cashAccountId, categoryId, transactionType, fromDate, toDate, search, isRecorded, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.transactionsWhereInput = { status: 'confirmed' };
    if (cashAccountId) where.cash_account_id = cashAccountId;
    if (categoryId) where.category_id = categoryId;
    if (transactionType) where.transaction_type = transactionType;
    if (isRecorded !== undefined) where.is_recorded = isRecorded;
    if (fromDate || toDate) {
      where.transaction_date = {};
      if (fromDate) where.transaction_date.gte = new Date(fromDate);
      if (toDate) where.transaction_date.lte = new Date(toDate);
    }
    if (search) {
      where.OR = [
        { transaction_code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { contact_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.transactions.findMany({
        where,
        include: {
          transaction_categories: true,
          cash_accounts: true,
          users_transactions_created_byTousers: { select: { id: true, full_name: true } },
        },
        skip,
        take: limit,
        orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }],
      }),
      this.prisma.transactions.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTransactionById(id: string) {
    const transaction = await this.prisma.transactions.findUnique({
      where: { id },
      include: {
        transaction_categories: true,
        cash_accounts: true,
        users_transactions_created_byTousers: { select: { id: true, full_name: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch');
    return transaction;
  }

  // ============ SUPPLIER PAYMENT METHODS ============
  async createSupplierPayment(dto: CreateSupplierPaymentDto, createdById?: string) {
    const supplier = await this.prisma.suppliers.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');

    const paymentDate = new Date(dto.paymentDate);
      const transactionCode = await this.generateTransactionCode(
        TransactionType.EXPENSE,
        paymentDate,
      );

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.transaction_categories.findFirst({
        where: { code: 'CP007', is_active: true },
      });

      

      const transaction = await tx.transactions.create({
        data: {
          cash_account_id: dto.cashAccountId,
          category_id: category?.id,
          transaction_code: transactionCode,
          transaction_type: TransactionType.EXPENSE,
          transaction_date: paymentDate,
          amount: dto.amount,
          contact_type: 'supplier',
          contact_id: dto.supplierId,
          contact_name: supplier.name,
          reference_type: 'other',
          description: dto.description || `Thanh toán công nợ NCC: ${supplier.name}`,
          notes: dto.notes,
          is_recorded: true,
          status: 'confirmed',
          created_by: createdById,
        },
      });

      await tx.cash_accounts.update({
        where: { id: dto.cashAccountId },
        data: { current_balance: { decrement: dto.amount } },
      });

      const balanceBefore = Number(supplier.total_debt);
      const balanceAfter = balanceBefore - dto.amount;

      await tx.suppliers.update({
        where: { id: dto.supplierId },
        data: { total_debt: Math.max(0, balanceAfter) },
      });

      await tx.supplier_debts.create({
        data: {
          supplier_id: dto.supplierId,
          reference_type: 'payment',
          reference_id: transaction.id,
          transaction_date: paymentDate,
          debt_amount: 0,
          payment_amount: dto.amount,
          balance_before: balanceBefore,
          balance_after: Math.max(0, balanceAfter),
        },
      });

      return transaction;
    }, 
  {
  maxWait: 5000, // Thời gian tối đa để lấy được kết nối database
  timeout: 10000, // Tăng thời gian thực thi lên 10 giây (10000ms)
});
  }

  // ============ CASH BOOK REPORT METHODS ============
  async getCashBookReport(dto: CashBookReportDto) {
    const { cashAccountId, fromDate, toDate } = dto;

    const where: Prisma.transactionsWhereInput = {
      status: 'confirmed',
      is_recorded: true,
      transaction_date: {
        gte: new Date(fromDate),
        lte: new Date(toDate),
      },
    };
    if (cashAccountId) where.cash_account_id = cashAccountId;

    const accounts = cashAccountId
      ? [await this.prisma.cash_accounts.findUnique({ where: { id: cashAccountId } })]
      : await this.prisma.cash_accounts.findMany({ where: { is_active: true } });

    let openingBalance = 0;
    for (const account of accounts) {
      if (!account) continue;
      const previousTransactions = await this.prisma.transactions.findMany({
        where: {
          cash_account_id: account.id,
          status: 'confirmed',
          is_recorded: true,
          transaction_date: { lt: new Date(fromDate) },
        },
      });

      let accountOpening = Number(account.opening_balance);
      for (const t of previousTransactions) {
        if (t.transaction_type === 'income') {
          accountOpening += Number(t.amount);
        } else {
          accountOpening -= Number(t.amount);
        }
      }
      openingBalance += accountOpening;
    }

    const transactions = await this.prisma.transactions.findMany({
      where,
      include: { transaction_categories: true, cash_accounts: true },
      orderBy: [{ transaction_date: 'asc' }, { created_at: 'asc' }],
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let runningBalance = openingBalance;

    const transactionsWithBalance = transactions.map((t) => {
      if (t.transaction_type === 'income') {
        totalIncome += Number(t.amount);
        runningBalance += Number(t.amount);
      } else {
        totalExpense += Number(t.amount);
        runningBalance -= Number(t.amount);
      }
      return { ...t, runningBalance };
    });

    return {
      fromDate,
      toDate,
      openingBalance,
      totalIncome,
      totalExpense,
      closingBalance: openingBalance + totalIncome - totalExpense,
      transactions: transactionsWithBalance,
    };
  }

  async getFinancialSummary(dto: FinancialSummaryDto) {
    const { month, year, fromDate, toDate } = dto;

    let dateFilter: { gte: Date; lte: Date };
    if (fromDate && toDate) {
      dateFilter = { gte: new Date(fromDate), lte: new Date(toDate) };
    } else if (month && year) {
      dateFilter = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0, 23, 59, 59),
      };
    } else {
      const now = new Date();
      dateFilter = {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
        lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    }

    const transactions = await this.prisma.transactions.findMany({
      where: {
        status: 'confirmed',
        is_recorded: true,
        transaction_date: dateFilter,
      },
      include: { transaction_categories: true },
    });

    const summary = {
      period: { from: dateFilter.gte, to: dateFilter.lte },
      totalIncome: 0,
      totalExpense: 0,
      profit: 0,
      incomeByCategory: {} as Record<string, { name: string; amount: number; count: number }>,
      expenseByCategory: {} as Record<string, { name: string; amount: number; count: number }>,
      dailySummary: {} as Record<string, { income: number; expense: number }>,
    };

    for (const t of transactions) {
      const amount = Number(t.amount);
      const categoryName = t.transaction_categories?.name || 'Chưa phân loại';
      const categoryId = t.category_id || 'uncategorized';
      const dateKey = t.transaction_date.toISOString().slice(0, 10);

      if (!summary.dailySummary[dateKey]) {
        summary.dailySummary[dateKey] = { income: 0, expense: 0 };
      }

      if (t.transaction_type === 'income') {
        summary.totalIncome += amount;
        summary.dailySummary[dateKey].income += amount;
        if (!summary.incomeByCategory[categoryId]) {
          summary.incomeByCategory[categoryId] = { name: categoryName, amount: 0, count: 0 };
        }
        summary.incomeByCategory[categoryId].amount += amount;
        summary.incomeByCategory[categoryId].count++;
      } else {
        summary.totalExpense += amount;
        summary.dailySummary[dateKey].expense += amount;
        if (!summary.expenseByCategory[categoryId]) {
          summary.expenseByCategory[categoryId] = { name: categoryName, amount: 0, count: 0 };
        }
        summary.expenseByCategory[categoryId].amount += amount;
        summary.expenseByCategory[categoryId].count++;
      }
    }

    summary.profit = summary.totalIncome - summary.totalExpense;
    return summary;
  }

  async getCashAccountBalances() {
    const accounts = await this.prisma.cash_accounts.findMany({
      where: { is_active: true },
    });

    let totalBalance = 0;
    const accountBalances = accounts.map((a) => {
      const balance = Number(a.current_balance);
      totalBalance += balance;
      return { id: a.id, name: a.name, type: a.account_type, balance };
    });

    return { totalBalance, accounts: accountBalances };
  }

  // ============ MONTHLY BILL METHODS ============
  async createMonthlyBill(dto: CreateMonthlyBillDto) {
    return this.prisma.monthly_bills.create({ data: NamingUtils.toSnakeCase(dto) });
  }

  async updateMonthlyBill(id: string, dto: UpdateMonthlyBillDto) {
    return this.prisma.monthly_bills.update({ where: { id }, data: NamingUtils.toSnakeCase(dto) });
  }

  async deleteMonthlyBill(id: string) {
    return this.prisma.monthly_bills.update({ where: { id }, data: { is_active: false } });
  }

  async getMonthlyBills() {
    return this.prisma.monthly_bills.findMany({
      where: { is_active: true },
      include: { transaction_categories: true },
      orderBy: { name: 'asc' },
    });
  }

  async createMonthlyBillRecord(dto: CreateMonthlyBillRecordDto) {
    const bill = await this.prisma.monthly_bills.findUnique({ where: { id: dto.billId } });
    if (!bill) throw new NotFoundException('Không tìm thấy hóa đơn tháng');

    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : bill.due_day
      ? new Date(dto.periodYear, dto.periodMonth - 1, bill.due_day)
      : null;

    return this.prisma.monthly_bill_records.create({
      data: {
        bill_id: dto.billId,
        period_month: dto.periodMonth,
        period_year: dto.periodYear,
        amount: dto.amount,
        due_date: dueDate,
        notes: dto.notes,
        status: 'pending',
      },
    });
  }

  async payMonthlyBill(dto: PayMonthlyBillDto, createdById?: string) {
    const record = await this.prisma.monthly_bill_records.findUnique({
      where: { id: dto.recordId },
      include: { monthly_bills: { include: { transaction_categories: true } } },
    });

    if (!record) throw new NotFoundException('Không tìm thấy bản ghi hóa đơn');
    if (record.status === 'paid') {
      throw new BadRequestException('Hóa đơn đã được thanh toán');
    }

    return this.prisma.$transaction(async (tx) => {
      const paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();
      const transactionCode = await this.generateTransactionCode(
        TransactionType.EXPENSE,
        paidDate,
      );

      const transaction = await tx.transactions.create({
        data: {
          cash_account_id: dto.cashAccountId,
          category_id: record.monthly_bills.category_id,
          transaction_code: transactionCode,
          transaction_type: TransactionType.EXPENSE,
          transaction_date: paidDate,
          amount: Number(record.amount),
          reference_type: 'invoice',
          reference_id: record.id,
          description: `Thanh toán ${record.monthly_bills.name} - ${record.period_month}/${record.period_year}`,
          notes: dto.notes,
          is_recorded: true,
          status: 'confirmed',
          created_by: createdById,
        },
      });

      await tx.cash_accounts.update({
        where: { id: dto.cashAccountId },
        data: { current_balance: { decrement: Number(record.amount) } },
      });

      await tx.monthly_bill_records.update({
        where: { id: dto.recordId },
        data: { status: 'paid', paid_date: paidDate, transaction_id: transaction.id },
      });

      return transaction;
    });
  }

  // Thanh toán trực tiếp từ bill - tự động tạo record nếu chưa có
  async payBillDirect(dto: PayBillDirectDto, createdById?: string) {
    const bill = await this.prisma.monthly_bills.findUnique({
      where: { id: dto.billId },
      include: { transaction_categories: true },
    });

    if (!bill) throw new NotFoundException('Không tìm thấy hóa đơn');

    return this.prisma.$transaction(async (tx) => {
      // Tìm hoặc tạo record cho tháng/năm
      let record = await tx.monthly_bill_records.findFirst({
        where: {
          bill_id: dto.billId,
          period_month: dto.periodMonth,
          period_year: dto.periodYear,
        },
      });

      if (record && record.status === 'paid') {
        throw new BadRequestException('Hóa đơn tháng này đã được thanh toán');
      }

      if (!record) {
        // Tạo record mới
        record = await tx.monthly_bill_records.create({
          data: {
            bill_id: dto.billId,
            period_month: dto.periodMonth,
            period_year: dto.periodYear,
            amount: dto.amount,
            status: 'pending',
          },
        });
      }

      // Tạo phiếu chi
      const paidDate = new Date(dto.paidDate);
      const transactionCode = await this.generateTransactionCode(
        TransactionType.EXPENSE,
        paidDate,
      );

      const transaction = await tx.transactions.create({
        data: {
          cash_account_id: dto.cashAccountId,
          category_id: bill.category_id,
          transaction_code: transactionCode,
          transaction_type: TransactionType.EXPENSE,
          transaction_date: paidDate,
          amount: dto.amount,
          reference_type: 'invoice',
          reference_id: record.id,
          description: `Thanh toán ${bill.name} - ${dto.periodMonth}/${dto.periodYear}`,
          notes: dto.notes,
          is_recorded: true,
          status: 'confirmed',
          created_by: createdById,
        },
      });

      // Cập nhật số dư tài khoản
      await tx.cash_accounts.update({
        where: { id: dto.cashAccountId },
        data: { current_balance: { decrement: dto.amount } },
      });

      // Cập nhật record
      await tx.monthly_bill_records.update({
        where: { id: record.id },
        data: { 
          status: 'paid', 
          paid_date: paidDate, 
          transaction_id: transaction.id,
          amount: dto.amount,
        },
      });

      return transaction;
    }, {
  maxWait: 5000, // Thời gian tối đa để lấy được kết nối database
  timeout: 10000, // Tăng thời gian thực thi lên 10 giây (10000ms)
});
  }

  async getMonthlyBillRecords(query: MonthlyBillQueryDto) {
    const where: Prisma.monthly_bill_recordsWhereInput = {};
    if (query.month) where.period_month = query.month;
    if (query.year) where.period_year = query.year;
    if (query.status) where.status = query.status;

    return this.prisma.monthly_bill_records.findMany({
      where,
      include: { monthly_bills: { include: { transaction_categories: true } }, transactions: true },
      orderBy: [{ period_year: 'desc' }, { period_month: 'desc' }],
    });
  }

  async getMonthlyBillSummary(month: number, year: number) {
    const today = new Date();

    // Get all records for the specified month/year
    const records = await this.prisma.monthly_bill_records.findMany({
      where: {
        period_month: month,
        period_year: year,
      },
    });

    let totalBills = records.length;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    for (const record of records) {
      const amount = Number(record.amount);
      totalAmount += amount;

      if (record.status === 'paid') {
        paidCount++;
        paidAmount += amount;
      } else {
        // Check if overdue
        if (record.due_date && new Date(record.due_date) < today) {
          overdueCount++;
        } else {
          pendingCount++;
        }
        pendingAmount += amount;
      }
    }

    return {
      totalBills,
      paidCount,
      pendingCount,
      overdueCount,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }

  // ============ CUSTOMER METHODS ============
  async createCustomer(dto: CreateCustomerDto) {
    if (!dto.code) {
      const count = await this.prisma.customers.count();
      dto.code = `KH${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.customers.create({ data: NamingUtils.toSnakeCase(dto) });
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    return this.prisma.customers.update({ where: { id }, data: NamingUtils.toSnakeCase(dto) });
  }

  async getCustomers(search?: string) {
    const where: any = { is_active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    return this.prisma.customers.findMany({ where, orderBy: { name: 'asc' } });
  }

  // ============ DASHBOARD METHODS ============
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [cashBalances, monthlyTransactions, supplierDebt, overdueCount] = await Promise.all([
      this.getCashAccountBalances(),
      this.prisma.transactions.groupBy({
        by: ['transaction_type'],
        where: {
          status: 'confirmed',
          is_recorded: true,
          transaction_date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.suppliers.aggregate({
        where: {  is_active: true },
        _sum: { total_debt: true },
      }),
      this.prisma.monthly_bill_records.count({
        where: {
          monthly_bills: { is_active: true },
          status: 'pending',
          due_date: { lt: now },
        },
      }),
    ]);

    const monthlyIncome = monthlyTransactions.find((t) => t.transaction_type === 'income');
    const monthlyExpense = monthlyTransactions.find((t) => t.transaction_type === 'expense');

    return {
      cashBalance: cashBalances.totalBalance,
      accounts: cashBalances.accounts,
      monthlyIncome: monthlyIncome?._sum.amount ? Number(monthlyIncome._sum.amount) : 0,
      monthlyExpense: monthlyExpense?._sum.amount ? Number(monthlyExpense._sum.amount) : 0,
      totalSupplierDebt: supplierDebt._sum.total_debt ? Number(supplierDebt._sum.total_debt) : 0,
      overdueCount,
    };
  }
}