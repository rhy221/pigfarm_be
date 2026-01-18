import { Injectable } from '@nestjs/common';
import { ReportRepository } from './report.repository';

@Injectable()
export class ReportService {
  constructor(private repo: ReportRepository) {}

  async getHerdReport(query: { date?: string; pen?: string }) {
    const targetDate = query.date ? new Date(query.date) : new Date();

    // Get stats directly from Pens and Pigs tables
    const penStats = await this.repo.getRealtimeHerdStats(
      targetDate,
      query.pen,
    );

    const pens = penStats.map((s) => ({
      penId: s.pen_id || '',
      penName: s.pen_name || '',
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
      report?.inventory_report_items.map(
        (i: {
          material_id: string;
          materials: { name: string } | null;
          opening_stock: number;
          change_amout: number;
          closing_stock: number;
        }) => ({
          materialId: String(i.material_id || ''),
          materialName: String(i.materials?.name || ''),
          openingStock: Number(i.opening_stock || 0),
          changeAmount: Number(i.change_amout || 0),
          closingStock: Number(i.closing_stock || 0),
        }),
      ) || [];

    return { month: targetMonth, items, trends: report?.trends || [] };
  }

  async getVaccineReport(query: { month?: string; vaccine?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const vaccineStats = await this.repo.getVaccineStatsDirect(
      startDate,
      endDate,
    );

    const details = vaccineStats.map((v) => ({
      vaccineId: String(v.vaccine_id || ''),
      vaccineName: String(v.vaccine_name || ''),
      diseaseName: String(v.disease_name || 'N/A'),
      cost: Number(v.cost || 0),
      totalVaccinated: Number(v.total_vaccinated || 0),
      sickCount: Number(v.sick_count || 0),
      effectivenessRate: Number(v.effectiveness_rate || 0),
    }));

    const totalVaccinated = details.reduce((s, d) => s + d.totalVaccinated, 0);
    const totalSick = details.reduce((s, d) => s + d.sickCount, 0);
    const totalCost = details.reduce((s, d) => s + d.cost, 0);
    const avgEffectiveness = details.length
      ? details.reduce((s, d) => s + d.effectivenessRate, 0) / details.length
      : 0;

    return {
      month: targetMonth,
      totalCost,
      totalPigs: totalVaccinated,
      totalSick,
      avgEffectiveness,
      details,
    };
  }

  async getVaccinesList() {
    return this.repo.getVaccines();
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

    const transactions = await this.repo.findTransactions(
      startDate,
      endDate,
      'expense',
      query.category,
      query.status,
    );
    const items = transactions.map((t) => ({
      id: t.id,
      transactionCode: t.transaction_code || '',
      date: t.transaction_date.toISOString().split('T')[0],
      category: t.transaction_categories?.name || 'Khác',
      amount: Number(t.amount) || 0,
      status: t.status || 'confirmed',
      description: t.description || '',
      contactName: t.contact_name || '',
    }));

    const total = items.reduce((s, e) => s + e.amount, 0);
    const confirmed = items
      .filter((e) => e.status === 'confirmed')
      .reduce((s, e) => s + e.amount, 0);

    return {
      month: targetMonth,
      totalExpense: total,
      paidExpense: confirmed,
      unpaidExpense: total - confirmed,
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
      description: `Xuất bán: ${s.customer_name || 'Khách lẻ'}`,
      amount: Number(s.total_amount) || 0,
      type: 'revenue' as const,
    }));

    // 1. Operational Expenses from Transactions
    const transactions = await this.repo.findTransactions(
      startDate,
      endDate,
      'expense',
    );
    const operationalExpenseItems = transactions.map((t) => ({
      id: t.id,
      date: t.transaction_date.toISOString().split('T')[0],
      description:
        t.description || `Chi phí: ${t.transaction_categories?.name || 'Khác'}`,
      amount: Number(t.amount) || 0,
      type: 'expense' as const,
    }));

    // 2. Import Expenses (Stock Receipts)
    const stockReceipts = await this.repo.findStockReceipts(startDate, endDate);
    const importExpenseItems = stockReceipts.map((r) => ({
      id: r.id,
      date: r.receipt_date.toISOString().split('T')[0],
      description: `Nhập kho: ${r.receipt_code} (${r.suppliers?.name || 'NCC lẻ'})`,
      amount: Number(r.final_amount || r.total_amount) || 0,
      type: 'expense' as const,
    }));

    // Combine Expenses
    const expenseItems = [...operationalExpenseItems, ...importExpenseItems];

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
