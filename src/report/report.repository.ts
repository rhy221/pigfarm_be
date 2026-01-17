import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Export interfaces for return types
export interface ProductSummary {
  material_id: string;
  materials: any;
  opening_stock: number;
  change_amout: number;
  closing_stock: number;
}

export interface VaccineStats {
  vaccine_id: string;
  vaccine_name: string;
  total_vaccinated: number;
  cost: number;
  effectiveness_rate: number;
}

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
    // 1. Get all inventory items to ensure everything is listed
    const allInventory = await this.prisma.inventory.findMany({
      include: { products: true },
    });

    // 2. Get inventory history for the period
    const inventoryHistory = await this.prisma.inventory_history.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      orderBy: { created_at: 'asc' },
    });

    // 3. Map history by product
    const historyMap = new Map<string, any[]>();
    for (const record of inventoryHistory) {
      if (!historyMap.has(record.product_id)) {
        historyMap.set(record.product_id, []);
      }
      historyMap.get(record.product_id)?.push(record);
    }

    // 4. Calculate stats for each product
    const inventoryReportItems = allInventory.map((inv) => {
      const history = historyMap.get(inv.product_id) || [];
      const changeAmount = history.reduce(
        (sum, h) => sum + Number(h.quantity_change),
        0,
      );

      // Closing stock: either the last record in the period, or current inventory if it's the current month
      let closingStock = Number(inv.quantity);
      if (history.length > 0) {
        closingStock = Number(history[history.length - 1].quantity_after);
      } else {
        // If no history in this period, we check if there's any history AFTER this period
        // to backtrack. But for simplicity, we'll use the current quantity.
        // In a real-world scenario, you'd want a daily snapshot table.
      }

      return {
        material_id: inv.product_id,
        materials: inv.products,
        opening_stock: closingStock - changeAmount,
        change_amout: changeAmount,
        closing_stock: closingStock,
      };
    });

    // 5. Calculate Trends (Last 6 months)
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7); // YYYY-MM

      // For a real trend, we would query daily_inventory_snapshots
      // Since we might not have it populated, we'll sum current total value as a placeholder or 
      // ideally query the snapshot table if it exists.
      const snapshot = await this.prisma.daily_inventory_snapshots.aggregate({
        where: {
          snapshot_date: {
            lte: new Date(d.getFullYear(), d.getMonth() + 1, 0),
            gte: new Date(d.getFullYear(), d.getMonth(), 1),
          },
        },
        _sum: {
          total_value: true,
        },
      });

      trends.push({
        month: monthStr,
        value: Number(snapshot._sum.total_value) || 0,
      });
    }

    return {
      id: 'generated',
      created_at: startDate,
      inventory_report_items: inventoryReportItems,
      trends: trends,
    };
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
    const where: {
      created_at: { gte: Date; lte: Date };
      expense_categories?: { name: string };
      payment_status?: string;
    } = {
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

  // Direct Real-time Herd Stats (Optimized with groupBy)
  async getRealtimeHerdStats(date: Date, penId?: string) {
    // End of the selected day
    const queryDate = new Date(date);
    queryDate.setHours(23, 59, 59, 999);

    // 1. Get all pens first (to have the list of all pens even if empty)
    const pens = await this.prisma.pens.findMany({
      where: penId ? { id: penId } : undefined,
      select: { id: true, pen_name: true },
    });

    // 2. Get shipped counts from shipping details (more accurate for history/cumulative)
    const shippingDetails = await this.prisma.pig_shipping_details.findMany({
      where: {
        pig_shippings: {
          export_date: { lte: queryDate },
        },
        ...(penId ? { pen_id: penId } : {}),
      },
      select: {
        pen_id: true,
        _count: {
          select: { shipped_pig_items: true },
        },
      },
    });

    const shippedMap = new Map<string, number>();
    for (const detail of shippingDetails) {
      const pId = detail.pen_id;
      if (pId) {
        const count = detail._count.shipped_pig_items;
        shippedMap.set(pId, (shippedMap.get(pId) || 0) + count);
      }
    }

    // 3. Group pigs by pen_id and pig_status_id
    const pigCounts = await this.prisma.pigs.groupBy({
      by: ['pen_id', 'pig_status_id'],
      where: {
        created_at: { lte: queryDate },
        ...(penId ? { pen_id: penId } : {}),
      },
      _count: {
        _all: true,
      },
    });

    // 4. Get all statuses to map names
    const statuses = await this.prisma.pig_statuses.findMany();
    const statusMap = new Map(
      statuses.map((s) => [s.id, s.status_name?.toLowerCase() || '']),
    );

    // 5. Map counts to pens
    return pens.map((pen) => {
      const stats = {
        pen_id: pen.id,
        pen_name: pen.pen_name,
        healthy_count: 0,
        sick_count: 0,
        dead_count: 0,
        shipped_count: shippedMap.get(pen.id) || 0,
      };

      // Filter counts for this pen
      const penCounts = pigCounts.filter((p) => p.pen_id === pen.id);

      penCounts.forEach((group) => {
        const rawStatus = statusMap.get(group.pig_status_id || '') || '';
        const statusName = rawStatus.trim().toLowerCase();
        const count = group._count._all;

        // Categorize based on status name keywords from user's actual data
        if (
          statusName.includes('khoẻ') ||
          statusName.includes('khỏe') ||
          statusName.includes('healthy')
        ) {
          stats.healthy_count += count;
        } else if (
          statusName.includes('ốm') ||
          statusName.includes('bệnh') ||
          statusName.includes('cách ly') ||
          statusName.includes('sick')
        ) {
          stats.sick_count += count;
        } else if (statusName.includes('chết') || statusName.includes('dead')) {
          stats.dead_count += count;
        } else if (
          statusName.includes('xuất') ||
          statusName.includes('shipped')
        ) {
          // Already counted from shipping details, ignore here to avoid double counting if inconsistent
        } else {
          // Default: Count as healthy
          stats.healthy_count += count;
        }
      });

      return stats;
    });
  }

  // Logic for Direct Vaccine Calculation
  async getVaccineStatsDirect(startDate: Date, endDate: Date) {
    const schedules = await this.prisma.vaccination_schedules.findMany({
      where: {
        scheduled_date: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      include: {
        vaccination_schedule_details: {
          include: { vaccines: true },
        },
        pens: {
          include: {
            pigs: {
              include: {
                pig_in_treatment: {
                  include: {
                    disease_treatments: {
                      include: { diseases: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Group by vaccine
    const statsMap = new Map<string, any>();

    for (const s of schedules) {
      for (const d of s.vaccination_schedule_details) {
        if (!d.vaccines) continue;
        const vId = d.vaccine_id;
        if (vId === null) continue;

        if (!statsMap.has(vId)) {
          statsMap.set(vId, {
            vaccine_id: vId,
            vaccine_name: d.vaccines.vaccine_name || '',
            disease_name: '', // Will populate if templates or history found
            total_vaccinated: 0,
            cost: 0,
            sick_count: 0,
          });
        }
        const item = statsMap.get(vId);
        if (item) {
          const pigCount = s.pens?.pigs.length || 0;
          item.total_vaccinated += pigCount;
          // Approximate cost (can be linked to stock_receipt_items later)
          item.cost += pigCount * (Number(d.dosage) || 1) * 5000; // Placeholder 5k/dose

          // Effectiveness: Count pigs that got sick AFTER being vaccinated in this period
          if (s.pens?.pigs) {
            for (const pig of s.pens.pigs) {
              const gotSick = pig.pig_in_treatment.some((t) => {
                const treatDate = new Date(t.created_at);
                const schedDate = s.scheduled_date ? new Date(s.scheduled_date) : new Date();
                return treatDate > schedDate;
              });
              if (gotSick) item.sick_count++;
            }
          }
        }
      }
    }

    return Array.from(statsMap.values()).map((v) => ({
      ...v,
      effectiveness_rate:
        v.total_vaccinated > 0
          ? ((v.total_vaccinated - v.sick_count) / v.total_vaccinated) * 100
          : 100,
    }));
  }
}
