import { Injectable } from '@nestjs/common';
import { ReportRepository } from './report.repository';

@Injectable()
export class ReportService {
  constructor(private repo: ReportRepository) {}

  async getHerdReport(query: { date?: string; pen?: string }) {
    const targetDate = query.date ? new Date(query.date) : new Date();
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    let report = await this.repo.findHerdReportByDate(startDate, endDate);
    if (!report) report = await this.repo.createHerdReport(targetDate);

    const penStats = await this.repo.findHerdReportPens(report.id, query.pen);
    const pens = penStats.map((s) => ({
      penId: s.pen_id || '',
      penName: s.pens?.pen_name || '',
      healthyCount: s.healthy_count || 0,
      sickCount: s.sick_count || 0,
      deadCount: s.dead_count || 0,
      shippedCount: s.shipped_count || 0,
    }));

    return {
      date: targetDate.toISOString().split('T')[0],
      totalPigs: pens.reduce((sum, p) => sum + p.healthyCount + p.sickCount, 0),
      pens,
    };
  }

  async getInventoryReport(query: { month?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const report = await this.repo.findInventoryReport(startDate, endDate);
    const items =
      report?.inventory_report_items.map((i) => ({
        materialId: i.material_id || '',
        materialName: i.materials?.name || '',
        openingStock: i.opening_stock || 0,
        changeAmount: i.change_amout || 0,
        closingStock: i.closing_stock || 0,
      })) || [];

    return { month: targetMonth, items, trends: [] };
  }

  async getVaccineReport(query: { month?: string; vaccine?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const report = await this.repo.findVaccineReport(
      startDate,
      endDate,
      query.vaccine,
    );
    const details =
      report?.vaccine_report_details.map((d) => ({
        vaccineId: d.vaccine_id || '',
        vaccineName: d.vaccines?.vaccine_name || '',
        diseaseName: d.diseases?.name || '',
        cost: Number(d.cost) || 0,
        totalVaccinated: d.total_vaccinated || 0,
        sickCount: 0,
        effectivenessRate: d.effectiveness_rate || 0,
      })) || [];

    return {
      month: targetMonth,
      totalCost: details.reduce((s, d) => s + d.cost, 0),
      totalPigs: details.reduce((s, d) => s + d.totalVaccinated, 0),
      totalSick: 0,
      avgEffectiveness: details.length
        ? details.reduce((s, d) => s + d.effectivenessRate, 0) / details.length
        : 0,
      details,
    };
  }

  async getExpenseReport(query: {
    month?: string;
    category?: string;
    status?: string;
  }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenses = await this.repo.findExpenses(
      startDate,
      endDate,
      query.category,
      query.status,
    );
    const items = expenses.map((e) => ({
      id: e.id,
      receiptCode: '',
      date: e.created_at.toISOString().split('T')[0],
      category: e.expense_categories?.name || '',
      amount: Number(e.amount) || 0,
      paymentStatus: e.payment_status || 'unpaid',
    }));

    const total = items.reduce((s, e) => s + e.amount, 0);
    const paid = items
      .filter((e) => e.paymentStatus === 'paid')
      .reduce((s, e) => s + e.amount, 0);

    return {
      month: targetMonth,
      totalExpense: total,
      paidExpense: paid,
      unpaidExpense: total - paid,
      expenses: items,
    };
  }

  async getRevenueReport(query: { month?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const shippings = await this.repo.findShippings(startDate, endDate);
    const revenueItems = shippings.map((s) => ({
      id: s.id,
      date: s.created_at.toISOString().split('T')[0],
      description: `Shipping to ${s.customer_name}`,
      amount: Number(s.total_amount) || 0,
      type: 'revenue' as const,
    }));

    const expenses = await this.repo.findExpenses(startDate, endDate);
    const expenseItems = expenses.map((e) => ({
      id: e.id,
      date: e.created_at.toISOString().split('T')[0],
      description: e.expense_categories?.name || 'Expense',
      amount: Number(e.amount) || 0,
      type: 'expense' as const,
    }));

    const totalRevenue = revenueItems.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expenseItems.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpense;

    return {
      month: targetMonth,
      totalRevenue,
      totalExpense,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      revenueItems,
      expenseItems,
    };
  }
}
