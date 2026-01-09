// =====================================================
// FINANCE MODULE - SERVICE (Quản lý chi phí / Sổ quỹ)
// =====================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
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

    const count = await this.prisma.transaction.count({
      where: {
        transactionType: type,
        transactionDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    return `${prefix}-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  // ============ TRANSACTION CATEGORY METHODS ============
  async createTransactionCategory(dto: CreateTransactionCategoryDto) {
    return this.prisma.transactionCategory.create({ data: dto });
  }

  async updateTransactionCategory(id: string, dto: UpdateTransactionCategoryDto) {
    return this.prisma.transactionCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTransactionCategory(id: string) {
    const category = await this.prisma.transactionCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    if (category.isSystem) {
      throw new BadRequestException('Không thể xóa danh mục hệ thống');
    }
    return this.prisma.transactionCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getTransactionCategories(type?: TransactionType) {
    const where: any = {
      isActive: true,
    };
    if (type) where.type = type;

    return this.prisma.transactionCategory.findMany({
      where,
      include: { children: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // ============ CASH ACCOUNT METHODS ============
  async createCashAccount(dto: CreateCashAccountDto) {
    if (dto.isDefault) {
      await this.prisma.cashAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.cashAccount.create({
      data: {
        ...dto,
        currentBalance: dto.openingBalance || 0,
      },
    });
  }

  async updateCashAccount(id: string, dto: UpdateCashAccountDto) {
    const account = await this.prisma.cashAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản');

    if (dto.isDefault) {
      await this.prisma.cashAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.cashAccount.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCashAccount(id: string) {
    return this.prisma.cashAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCashAccounts() {
    return this.prisma.cashAccount.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async getCashAccountById(id: string) {
    const account = await this.prisma.cashAccount.findUnique({ where: { id } });
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
      const newTransaction = await tx.transaction.create({
        data: {
          cashAccountId: dto.cashAccountId,
          categoryId: dto.categoryId,
          transactionCode,
          transactionType: dto.transactionType,
          transactionDate,
          amount: dto.amount,
          contactType: dto.contactType,
          contactId: dto.contactId,
          contactName: dto.contactName,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          description: dto.description,
          notes: dto.notes,
          isRecorded: dto.isRecorded ?? true,
          status: 'confirmed',
          createdById,
        },
        include: {
          category: true,
          cashAccount: true,
        },
      });

      if (newTransaction.isRecorded) {
        const balanceChange =
          dto.transactionType === TransactionType.INCOME ? dto.amount : -dto.amount;

        await tx.cashAccount.update({
          where: { id: dto.cashAccountId },
          data: {
            currentBalance: { increment: balanceChange },
          },
        });
      }

      return newTransaction;
    });
  }

  async updateTransaction(id: string, dto: UpdateTransactionDto) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch');

    return this.prisma.$transaction(async (tx) => {
      if (transaction.isRecorded) {
        const oldBalanceChange =
          transaction.transactionType === 'income'
            ? -Number(transaction.amount)
            : Number(transaction.amount);

        await tx.cashAccount.update({
          where: { id: transaction.cashAccountId },
          data: { currentBalance: { increment: oldBalanceChange } },
        });
      }

      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          categoryId: dto.categoryId,
          transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : undefined,
          amount: dto.amount,
          contactType: dto.contactType,
          contactId: dto.contactId,
          contactName: dto.contactName,
          description: dto.description,
          notes: dto.notes,
          isRecorded: dto.isRecorded,
        },
        include: {
          category: true,
          cashAccount: true,
        },
      });

      const isRecorded = dto.isRecorded ?? updatedTransaction.isRecorded;
      if (isRecorded) {
        const newAmount = dto.amount ?? Number(transaction.amount);
        const type = dto.transactionType ?? transaction.transactionType;
        const newBalanceChange = type === 'income' ? newAmount : -newAmount;

        await tx.cashAccount.update({
          where: { id: updatedTransaction.cashAccountId },
          data: { currentBalance: { increment: newBalanceChange } },
        });
      }

      return updatedTransaction;
    });
  }

  async deleteTransaction(id: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch');

    return this.prisma.$transaction(async (tx) => {
      if (transaction.isRecorded) {
        const balanceChange =
          transaction.transactionType === 'income'
            ? -Number(transaction.amount)
            : Number(transaction.amount);

        await tx.cashAccount.update({
          where: { id: transaction.cashAccountId },
          data: { currentBalance: { increment: balanceChange } },
        });
      }

      return tx.transaction.update({
        where: { id },
        data: { status: 'cancelled' },
      });
    });
  }

  async getTransactions(query: TransactionQueryDto) {
    const { cashAccountId, categoryId, transactionType, fromDate, toDate, search, isRecorded, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: 'confirmed' };
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (categoryId) where.categoryId = categoryId;
    if (transactionType) where.transactionType = transactionType;
    if (isRecorded !== undefined) where.isRecorded = isRecorded;
    if (fromDate || toDate) {
      where.transactionDate = {};
      if (fromDate) where.transactionDate.gte = new Date(fromDate);
      if (toDate) where.transactionDate.lte = new Date(toDate);
    }
    if (search) {
      where.OR = [
        { transactionCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          category: true,
          cashAccount: true,
          createdBy: { select: { id: true, fullName: true } },
        },
        skip,
        take: limit,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTransactionById(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        cashAccount: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch');
    return transaction;
  }

  // ============ SUPPLIER PAYMENT METHODS ============
  async createSupplierPayment(dto: CreateSupplierPaymentDto, createdById?: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.transactionCategory.findFirst({
        where: { code: 'CP007', isActive: true },
      });

      const paymentDate = new Date(dto.paymentDate);
      const transactionCode = await this.generateTransactionCode(
        TransactionType.EXPENSE,
        paymentDate,
      );

      const transaction = await tx.transaction.create({
        data: {
          cashAccountId: dto.cashAccountId,
          categoryId: category?.id,
          transactionCode,
          transactionType: TransactionType.EXPENSE,
          transactionDate: paymentDate,
          amount: dto.amount,
          contactType: 'supplier',
          contactId: dto.supplierId,
          contactName: supplier.name,
          referenceType: 'other',
          description: dto.description || `Thanh toán công nợ NCC: ${supplier.name}`,
          notes: dto.notes,
          isRecorded: true,
          status: 'confirmed',
          createdById,
        },
      });

      await tx.cashAccount.update({
        where: { id: dto.cashAccountId },
        data: { currentBalance: { decrement: dto.amount } },
      });

      const balanceBefore = Number(supplier.totalDebt);
      const balanceAfter = balanceBefore - dto.amount;

      await tx.supplier.update({
        where: { id: dto.supplierId },
        data: { totalDebt: Math.max(0, balanceAfter) },
      });

      await tx.supplierDebt.create({
        data: {
          supplierId: dto.supplierId,
          referenceType: 'payment',
          referenceId: transaction.id,
          transactionDate: paymentDate,
          debtAmount: 0,
          paymentAmount: dto.amount,
          balanceBefore,
          balanceAfter: Math.max(0, balanceAfter),
        },
      });

      return transaction;
    });
  }

  // ============ CASH BOOK REPORT METHODS ============
  async getCashBookReport(dto: CashBookReportDto) {
    const { cashAccountId, fromDate, toDate } = dto;

    const where: any = {
      status: 'confirmed',
      isRecorded: true,
      transactionDate: {
        gte: new Date(fromDate),
        lte: new Date(toDate),
      },
    };
    if (cashAccountId) where.cashAccountId = cashAccountId;

    const accounts = cashAccountId
      ? [await this.prisma.cashAccount.findUnique({ where: { id: cashAccountId } })]
      : await this.prisma.cashAccount.findMany({ where: { isActive: true } });

    let openingBalance = 0;
    for (const account of accounts) {
      if (!account) continue;
      const previousTransactions = await this.prisma.transaction.findMany({
        where: {
          cashAccountId: account.id,
          status: 'confirmed',
          isRecorded: true,
          transactionDate: { lt: new Date(fromDate) },
        },
      });

      let accountOpening = Number(account.openingBalance);
      for (const t of previousTransactions) {
        if (t.transactionType === 'income') {
          accountOpening += Number(t.amount);
        } else {
          accountOpening -= Number(t.amount);
        }
      }
      openingBalance += accountOpening;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true, cashAccount: true },
      orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let runningBalance = openingBalance;

    const transactionsWithBalance = transactions.map((t) => {
      if (t.transactionType === 'income') {
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

    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: 'confirmed',
        isRecorded: true,
        transactionDate: dateFilter,
      },
      include: { category: true },
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
      const categoryName = t.category?.name || 'Chưa phân loại';
      const categoryId = t.categoryId || 'uncategorized';
      const dateKey = t.transactionDate.toISOString().slice(0, 10);

      if (!summary.dailySummary[dateKey]) {
        summary.dailySummary[dateKey] = { income: 0, expense: 0 };
      }

      if (t.transactionType === 'income') {
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
    const accounts = await this.prisma.cashAccount.findMany({
      where: { isActive: true },
    });

    let totalBalance = 0;
    const accountBalances = accounts.map((a) => {
      const balance = Number(a.currentBalance);
      totalBalance += balance;
      return { id: a.id, name: a.name, type: a.accountType, balance };
    });

    return { totalBalance, accounts: accountBalances };
  }

  // ============ MONTHLY BILL METHODS ============
  async createMonthlyBill(dto: CreateMonthlyBillDto) {
    return this.prisma.monthlyBill.create({ data: dto });
  }

  async updateMonthlyBill(id: string, dto: UpdateMonthlyBillDto) {
    return this.prisma.monthlyBill.update({ where: { id }, data: dto });
  }

  async deleteMonthlyBill(id: string) {
    return this.prisma.monthlyBill.update({ where: { id }, data: { isActive: false } });
  }

  async getMonthlyBills() {
    return this.prisma.monthlyBill.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async createMonthlyBillRecord(dto: CreateMonthlyBillRecordDto) {
    const bill = await this.prisma.monthlyBill.findUnique({ where: { id: dto.billId } });
    if (!bill) throw new NotFoundException('Không tìm thấy hóa đơn tháng');

    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : bill.dueDay
      ? new Date(dto.periodYear, dto.periodMonth - 1, bill.dueDay)
      : null;

    return this.prisma.monthlyBillRecord.create({
      data: {
        billId: dto.billId,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        amount: dto.amount,
        dueDate,
        notes: dto.notes,
        status: 'pending',
      },
    });
  }

  async payMonthlyBill(dto: PayMonthlyBillDto, createdById?: string) {
    const record = await this.prisma.monthlyBillRecord.findUnique({
      where: { id: dto.recordId },
      include: { bill: { include: { category: true } } },
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

      const transaction = await tx.transaction.create({
        data: {
          cashAccountId: dto.cashAccountId,
          categoryId: record.bill.categoryId,
          transactionCode,
          transactionType: TransactionType.EXPENSE,
          transactionDate: paidDate,
          amount: Number(record.amount),
          referenceType: 'invoice',
          referenceId: record.id,
          description: `Thanh toán ${record.bill.name} - ${record.periodMonth}/${record.periodYear}`,
          notes: dto.notes,
          isRecorded: true,
          status: 'confirmed',
          createdById,
        },
      });

      await tx.cashAccount.update({
        where: { id: dto.cashAccountId },
        data: { currentBalance: { decrement: Number(record.amount) } },
      });

      await tx.monthlyBillRecord.update({
        where: { id: dto.recordId },
        data: { status: 'paid', paidDate, transactionId: transaction.id },
      });

      return transaction;
    });
  }

  // Thanh toán trực tiếp từ bill - tự động tạo record nếu chưa có
  async payBillDirect(dto: PayBillDirectDto, createdById?: string) {
    const bill = await this.prisma.monthlyBill.findUnique({
      where: { id: dto.billId },
      include: { category: true },
    });

    if (!bill) throw new NotFoundException('Không tìm thấy hóa đơn');

    return this.prisma.$transaction(async (tx) => {
      // Tìm hoặc tạo record cho tháng/năm
      let record = await tx.monthlyBillRecord.findFirst({
        where: {
          billId: dto.billId,
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
        },
      });

      if (record && record.status === 'paid') {
        throw new BadRequestException('Hóa đơn tháng này đã được thanh toán');
      }

      if (!record) {
        // Tạo record mới
        record = await tx.monthlyBillRecord.create({
          data: {
            billId: dto.billId,
            periodMonth: dto.periodMonth,
            periodYear: dto.periodYear,
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

      const transaction = await tx.transaction.create({
        data: {
          cashAccountId: dto.cashAccountId,
          categoryId: bill.categoryId,
          transactionCode,
          transactionType: TransactionType.EXPENSE,
          transactionDate: paidDate,
          amount: dto.amount,
          referenceType: 'invoice',
          referenceId: record.id,
          description: `Thanh toán ${bill.name} - ${dto.periodMonth}/${dto.periodYear}`,
          notes: dto.notes,
          isRecorded: true,
          status: 'confirmed',
          createdById,
        },
      });

      // Cập nhật số dư tài khoản
      await tx.cashAccount.update({
        where: { id: dto.cashAccountId },
        data: { currentBalance: { decrement: dto.amount } },
      });

      // Cập nhật record
      await tx.monthlyBillRecord.update({
        where: { id: record.id },
        data: { 
          status: 'paid', 
          paidDate, 
          transactionId: transaction.id,
          amount: dto.amount,
        },
      });

      return transaction;
    });
  }

  async getMonthlyBillRecords(query: MonthlyBillQueryDto) {
    const where: any = {};
    if (query.month) where.periodMonth = query.month;
    if (query.year) where.periodYear = query.year;
    if (query.status) where.status = query.status;

    return this.prisma.monthlyBillRecord.findMany({
      where,
      include: { bill: { include: { category: true } }, transaction: true },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  // ============ CUSTOMER METHODS ============
  async createCustomer(dto: CreateCustomerDto) {
    if (!dto.code) {
      const count = await this.prisma.customer.count();
      dto.code = `KH${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.customer.create({ data: dto });
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async getCustomers(search?: string) {
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    return this.prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
  }

  // ============ DASHBOARD METHODS ============
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [cashBalances, monthlyTransactions, supplierDebt, overdueCount] = await Promise.all([
      this.getCashAccountBalances(),
      this.prisma.transaction.groupBy({
        by: ['transactionType'],
        where: {
          status: 'confirmed',
          isRecorded: true,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.supplier.aggregate({
        where: {  isActive: true },
        _sum: { totalDebt: true },
      }),
      this.prisma.monthlyBillRecord.count({
        where: {
          bill: { isActive: true },
          status: 'pending',
          dueDate: { lt: now },
        },
      }),
    ]);

    const monthlyIncome = monthlyTransactions.find((t) => t.transactionType === 'income');
    const monthlyExpense = monthlyTransactions.find((t) => t.transactionType === 'expense');

    return {
      cashBalance: cashBalances.totalBalance,
      accounts: cashBalances.accounts,
      monthlyIncome: monthlyIncome?._sum.amount ? Number(monthlyIncome._sum.amount) : 0,
      monthlyExpense: monthlyExpense?._sum.amount ? Number(monthlyExpense._sum.amount) : 0,
      totalSupplierDebt: supplierDebt._sum.totalDebt ? Number(supplierDebt._sum.totalDebt) : 0,
      overdueCount,
    };
  }
}