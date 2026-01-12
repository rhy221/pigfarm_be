import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportRepository {
  constructor(private prisma: PrismaService) {}

  // Herd Reports
  async findHerdReportByDate(startDate: Date, endDate: Date) {
    return this.prisma.herd_reports.findFirst({
      where: { created_at: { gte: startDate, lte: endDate } },
    });
  }

  async createHerdReport(date: Date) {
    return this.prisma.herd_reports.create({ data: { created_at: date } });
  }

  async findHerdReportPens(reportId: string, penId?: string) {
    return this.prisma.herd_report_pens.findMany({
      where: { herd_report_id: reportId, ...(penId && { pen_id: penId }) },
      include: { pens: true },
    });
  }

  // Inventory Reports
  async findInventoryReport(startDate: Date, endDate: Date) {
    return this.prisma.inventory_reports.findFirst({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: { inventory_report_items: { include: { materials: true } } },
    });
  }

  // Vaccine Reports
  async findVaccineReport(startDate: Date, endDate: Date, vaccineId?: string) {
    return this.prisma.vaccine_reports.findFirst({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: {
        vaccine_report_details: {
          include: { vaccines: true, diseases: true },
          ...(vaccineId && { where: { vaccine_id: vaccineId } }),
        },
      },
    });
  }

  // Expenses
  async findExpenses(
    startDate: Date,
    endDate: Date,
    category?: string,
    status?: string,
  ) {
    const where: Prisma.expensesWhereInput = {
      created_at: { gte: startDate, lte: endDate },
    };
    if (category) where.expense_categories = { name: category };
    if (status && status !== 'all') where.payment_status = status;

    return this.prisma.expenses.findMany({
      where,
      include: { expense_categories: true, expense_entities: true },
      orderBy: { created_at: 'desc' },
    });
  }

  // Revenue (Shippings)
  async findShippings(startDate: Date, endDate: Date) {
    return this.prisma.pig_shippings.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: { pig_shipping_details: true },
    });
  }
}
