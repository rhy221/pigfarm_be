import { Injectable } from '@nestjs/common';
import { ReportRepository } from './report.repository';

@Injectable()
export class ReportService {
  constructor(private repo: ReportRepository) {}

  async getHerdReport(query: { date?: string; month?: string; pen?: string }) {
    let targetDate: Date;
    let dateLabel: string;

    // Ưu tiên month nếu có, nếu không dùng date
    if (query.month) {
      const targetMonth = query.month;

      // Kiểm tra nếu chọn "all" hoặc chỉ có năm (VD: "2026" hoặc "2026-all")
      if (targetMonth.includes('all') || !targetMonth.includes('-')) {
        const year = parseInt(targetMonth.split('-')[0]);
        // Với "all", lấy ngày cuối năm
        targetDate = new Date(year, 11, 31, 23, 59, 59);
        dateLabel = `Năm ${year}`;
      } else {
        // Lấy ngày cuối tháng
        const [year, month] = targetMonth.split('-').map(Number);
        targetDate = new Date(year, month, 0, 23, 59, 59);
        dateLabel = `${targetMonth}`;
      }
    } else {
      targetDate = query.date ? new Date(query.date) : new Date();
      dateLabel = targetDate.toISOString().split('T')[0];
    }

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
      date: dateLabel,
      totalPigs: pens.reduce((sum, p) => sum + p.healthyCount + p.sickCount, 0),
      pens,
    };
  }
  async getInventoryReport(query: {
    month?: string;
    warehouseId?: string;
    categoryId?: string;
  }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    let startDate: Date;
    let endDate: Date;

    // Kiểm tra nếu chọn "all" hoặc chỉ có năm (VD: "2026" hoặc "2026-all")
    if (targetMonth.includes('all') || !targetMonth.includes('-')) {
      const year = parseInt(targetMonth.split('-')[0]);
      startDate = new Date(year, 0, 1); // 1/1/năm
      endDate = new Date(year, 11, 31, 23, 59, 59); // 31/12/năm
    } else {
      const [year, month] = targetMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    const report = await this.repo.findInventoryReport(
      startDate,
      endDate,
      query.warehouseId,
      query.categoryId,
    );
    const items =
      report?.inventory_report_items.map((i: any) => ({
        productId: String(i.product_id || ''),
        productName: String(i.products?.name || ''),
        productCode: String(i.products?.code || ''),
        openingStock: Number(i.opening_stock || 0),
        receivedQuantity: Number(i.received_quantity || 0),
        issuedQuantity: Number(i.issued_quantity || 0),
        closingStock: Number(i.closing_stock || 0),
        avgCost: Number(i.avg_cost || 0),
        totalValue: Number(i.total_value || 0),
      })) || [];

    const firstItem = report?.inventory_report_items[0];
    return {
      month: targetMonth,
      warehouseId: query.warehouseId,
      warehouseName: firstItem?.warehouses?.name,
      items,
      trends: report?.trends || [],
    };
  }

  async getVaccineReport(query: { month?: string; vaccine?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    let startDate: Date;
    let endDate: Date;

    // Kiểm tra nếu chọn "all" hoặc chỉ có năm (VD: "2026" hoặc "2026-all")
    if (targetMonth.includes('all') || !targetMonth.includes('-')) {
      const year = parseInt(targetMonth.split('-')[0]);
      startDate = new Date(year, 0, 1); // 1/1/năm
      endDate = new Date(year, 11, 31, 23, 59, 59); // 31/12/năm
    } else {
      const [year, month] = targetMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    const vaccineStats = await this.repo.getVaccineStatsDirect(
      startDate,
      endDate,
      query.vaccine,
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
    type?: string;
  }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    let startDate: Date;
    let endDate: Date;

    // Kiểm tra nếu chọn "all" hoặc chỉ có năm (VD: "2026" hoặc "2026-all")
    if (targetMonth.includes('all') || !targetMonth.includes('-')) {
      const year = parseInt(targetMonth.split('-')[0]);
      startDate = new Date(year, 0, 1); // 1/1/năm
      endDate = new Date(year, 11, 31, 23, 59, 59); // 31/12/năm
    } else {
      const [year, month] = targetMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    // Lấy transactions theo loại (income/expense/all)
    const transactionType =
      query.type === 'all' ? undefined : query.type || 'expense';

    const transactions = await this.repo.findTransactions(
      startDate,
      endDate,
      transactionType,
      query.category,
      query.status,
    );

    const items = transactions.map((t) => ({
      id: t.id,
      transactionCode: t.transaction_code || '',
      date: t.transaction_date.toISOString().split('T')[0],
      category: t.transaction_categories?.name || 'Khác',
      amount: Number(t.amount) || 0,
      type: (t.transaction_type as 'income' | 'expense') || 'expense',
      status: t.status || 'confirmed',
      isRecorded: t.is_recorded ?? true,
      description: t.description || '',
      contactName: t.contact_name || '',
    }));

    // Tính toán chi
    const expenseItems = items.filter((t) => t.type === 'expense');
    const totalExpense = expenseItems.reduce((s, e) => s + e.amount, 0);
    const recordedExpense = expenseItems
      .filter((e) => e.isRecorded)
      .reduce((s, e) => s + e.amount, 0);
    const unrecordedExpense = totalExpense - recordedExpense;

    // Tính toán thu
    const incomeItems = items.filter((t) => t.type === 'income');
    const totalIncome = incomeItems.reduce((s, e) => s + e.amount, 0);
    const recordedIncome = incomeItems
      .filter((e) => e.isRecorded)
      .reduce((s, e) => s + e.amount, 0);
    const unrecordedIncome = totalIncome - recordedIncome;

    // Thu ròng
    const netAmount = totalIncome - totalExpense;

    return {
      month: targetMonth,
      totalExpense,
      recordedExpense,
      unrecordedExpense,
      totalIncome,
      recordedIncome,
      unrecordedIncome,
      netAmount,
      transactions: items,
    };
  }

  async getRevenueReport(query: { month?: string }) {
    const targetMonth = query.month || new Date().toISOString().slice(0, 7);
    let startDate: Date;
    let endDate: Date;

    // Kiểm tra nếu chọn "all" hoặc chỉ có năm (VD: "2026" hoặc "2026-all")
    if (targetMonth.includes('all') || !targetMonth.includes('-')) {
      const year = parseInt(targetMonth.split('-')[0]);
      startDate = new Date(year, 0, 1); // 1/1/năm
      endDate = new Date(year, 11, 31, 23, 59, 59); // 31/12/năm
    } else {
      const [year, month] = targetMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    // Lấy TẤT CẢ transactions (cả thu và chi) từ bảng transactions
    const allTransactions = await this.repo.findTransactions(
      startDate,
      endDate,
      undefined, // Lấy tất cả
    );

    // Phân loại thành thu và chi
    const revenueItems = allTransactions
      .filter((t) => t.transaction_type === 'income')
      .map((t) => ({
        id: t.id,
        date: t.transaction_date.toISOString().split('T')[0],
        description:
          t.description || `Thu: ${t.transaction_categories?.name || 'Khác'}`,
        amount: Number(t.amount) || 0,
        type: 'revenue' as const,
        isRecorded: t.is_recorded ?? true,
        contactName: t.contact_name || '',
      }));

    const expenseItems = allTransactions
      .filter((t) => t.transaction_type === 'expense')
      .map((t) => ({
        id: t.id,
        date: t.transaction_date.toISOString().split('T')[0],
        description:
          t.description || `Chi: ${t.transaction_categories?.name || 'Khác'}`,
        amount: Number(t.amount) || 0,
        type: 'expense' as const,
        isRecorded: t.is_recorded ?? true,
        contactName: t.contact_name || '',
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
