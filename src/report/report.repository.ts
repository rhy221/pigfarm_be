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
  disease_name: string;
  total_vaccinated: number;
  cost: number;
  sick_count: number;
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

  // Inventory Reports - Using inventory + inventory_history
  async findInventoryReport(
    startDate: Date,
    endDate: Date,
    warehouseId?: string,
    categoryId?: string,
  ) {
    // 1. Get all inventory items
    const inventoryWhere: any = {};
    if (warehouseId) {
      inventoryWhere.warehouse_id = warehouseId;
    }
    if (categoryId) {
      inventoryWhere.products = {
        category_id: categoryId,
      };
    }

    const allInventory = await this.prisma.inventory.findMany({
      where: inventoryWhere,
      include: {
        products: true,
        warehouses: true,
      },
    });

    // Lấy danh sách product_id để filter history nếu có categoryId
    const productIds = allInventory.map((inv) => inv.product_id);

    // 2. Get ALL history up to endDate (để tính tồn đầu và trong tháng)
    const historyWhereAll: any = {
      created_at: { lte: endDate },
    };
    if (warehouseId) {
      historyWhereAll.warehouse_id = warehouseId;
    }
    if (categoryId && productIds.length > 0) {
      historyWhereAll.product_id = { in: productIds };
    }

    const allHistory = await this.prisma.inventory_history.findMany({
      where: historyWhereAll,
      orderBy: { created_at: 'asc' },
    });

    // 3. Map history by product + warehouse
    const historyBeforeMap = new Map<string, any[]>(); // history before startDate
    const historyInPeriodMap = new Map<string, any[]>(); // history in period

    for (const record of allHistory) {
      const key = `${record.warehouse_id}_${record.product_id}`;

      if (record.created_at && record.created_at < startDate) {
        // History before period (để tính tồn đầu)
        if (!historyBeforeMap.has(key)) {
          historyBeforeMap.set(key, []);
        }
        historyBeforeMap.get(key)?.push(record);
      } else if (record.created_at) {
        // History in period (để tính nhập/xuất trong tháng)
        if (!historyInPeriodMap.has(key)) {
          historyInPeriodMap.set(key, []);
        }
        historyInPeriodMap.get(key)?.push(record);
      }
    }

    // 4. Calculate for each inventory item
    const inventoryReportItems = allInventory.map((inv) => {
      const key = `${inv.warehouse_id}_${inv.product_id}`;
      const historyBefore = historyBeforeMap.get(key) || [];
      const historyInPeriod = historyInPeriodMap.get(key) || [];

      // Tồn đầu: Ưu tiên lấy từ history trong tháng trước
      let openingStock = 0;
      if (historyInPeriod.length > 0) {
        // Có history trong tháng → lấy quantity_before của record ĐẦU TIÊN
        const firstRecord = historyInPeriod[0];
        openingStock = Number(firstRecord.quantity_before || 0);
      } else if (historyBefore.length > 0) {
        // Không có history trong tháng nhưng có history trước đó
        // → lấy quantity_after của record cuối cùng trước tháng
        const lastRecord = historyBefore[historyBefore.length - 1];
        openingStock = Number(lastRecord.quantity_after || 0);
      } else {
        // Không có history nào cả → lấy quantity hiện tại
        openingStock = Number(inv.quantity || 0);
      }

      // Tính nhập và xuất TRONG tháng
      const receivedQuantity = historyInPeriod
        .filter((h) => h.transaction_type?.toLowerCase() === 'in')
        .reduce((sum, h) => sum + Math.abs(Number(h.quantity_change || 0)), 0);

      const issuedQuantity = historyInPeriod
        .filter((h) => h.transaction_type?.toLowerCase() === 'out')
        .reduce((sum, h) => sum + Math.abs(Number(h.quantity_change || 0)), 0);

      // Tồn cuối = tồn đầu + nhập - xuất
      let closingStock = openingStock + receivedQuantity - issuedQuantity;

      // Nếu không có history nào cả, dùng quantity hiện tại
      if (historyBefore.length === 0 && historyInPeriod.length === 0) {
        closingStock = Number(inv.quantity || 0);
      }

      const totalValue = closingStock * Number(inv.avg_cost);

      return {
        product_id: inv.product_id,
        products: inv.products,
        warehouses: inv.warehouses,
        opening_stock: openingStock,
        received_quantity: receivedQuantity,
        issued_quantity: issuedQuantity,
        closing_stock: closingStock,
        avg_cost: Number(inv.avg_cost),
        total_value: totalValue,
      };
    });

    // Calculate Trends (Last 6 months) - tính đúng giá trị tồn cuối từng tháng
    const trends: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7);

      // Lấy ngày cuối tháng
      const trendEndDate = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const trendHistoryWhere: any = {
        created_at: { lte: trendEndDate },
      };
      if (warehouseId) {
        trendHistoryWhere.warehouse_id = warehouseId;
      }
      if (categoryId) {
        // Filter by product category
        const productsInCategory = await this.prisma.products.findMany({
          where: { category_id: categoryId },
          select: { id: true },
        });
        trendHistoryWhere.product_id = {
          in: productsInCategory.map((p) => p.id),
        };
      }

      // Lấy tất cả history đến cuối tháng đó
      const trendHistory = await this.prisma.inventory_history.findMany({
        where: trendHistoryWhere,
        orderBy: { created_at: 'asc' },
      });

      // Group by product để lấy quantity_after cuối cùng
      const productLastHistory = new Map<string, any>();
      for (const record of trendHistory) {
        const key = `${record.warehouse_id}_${record.product_id}`;
        productLastHistory.set(key, record);
      }

      // Tính tổng giá trị = sum(quantity_after * avg_cost)
      let totalValue = 0;
      for (const [key, lastRecord] of productLastHistory.entries()) {
        // Lấy avg_cost từ inventory hiện tại
        const [warehouseId, productId] = key.split('_');
        const inv = allInventory.find(
          (i) => i.warehouse_id === warehouseId && i.product_id === productId,
        );
        if (inv) {
          totalValue +=
            Number(lastRecord.quantity_after || 0) * Number(inv.avg_cost || 0);
        }
      }

      trends.push({
        month: monthStr,
        value: totalValue,
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

  // Transactions (replaced Expenses)
  async findTransactions(
    startDate: Date,
    endDate: Date,
    transactionType?: string,
    category?: string,
    status?: string,
  ) {
    const where: any = {
      transaction_date: { gte: startDate, lte: endDate },
    };

    if (transactionType) {
      where.transaction_type = transactionType;
    }

    if (category) {
      where.transaction_categories = { name: category };
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    return this.prisma.transactions.findMany({
      where,
      include: {
        transaction_categories: true,
        cash_accounts: true,
      },
      orderBy: { transaction_date: 'desc' },
    });
  }

  // Revenue (Shippings)
  async findShippings(startDate: Date, endDate: Date) {
    return this.prisma.pig_shippings.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: { pig_shipping_details: true },
    });
  }

  // Stock Receipts (Import Cost)
  async findStockReceipts(startDate: Date, endDate: Date) {
    return this.prisma.stock_receipts.findMany({
      where: {
        receipt_date: { gte: startDate, lte: endDate },
      },
      include: { suppliers: true },
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
  async getVaccineStatsDirect(
    startDate: Date,
    endDate: Date,
    vaccineId?: string,
  ) {
    const schedules = await this.prisma.vaccination_schedules.findMany({
      where: {
        scheduled_date: { gte: startDate, lte: endDate },
        status: 'completed',
        ...(vaccineId && {
          vaccination_schedule_details: {
            some: {
              vaccine_id: vaccineId,
            },
          },
        }),
      },
      include: {
        vaccination_schedule_details: {
          include: { vaccines: true },
        },
        pens: {
          include: {
            pigs: {
              include: {
                pigs_in_treatment: {
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
              const gotSick = pig.pigs_in_treatment.some((t) => {
                const treatment = t.disease_treatments;
                if (!treatment) return false; // Safety check

                const treatDate = new Date(treatment.created_at);
                const schedDate = s.scheduled_date
                  ? new Date(s.scheduled_date)
                  : new Date();

                // Check if the disease matches the vaccine's target disease (if we knew it)
                // For now, we assume any disease is bad, OR we could try to match names if available.
                // Improving: check if disease_id matches what the vaccine prevents (if we had that link).

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

  async getVaccines() {
    return this.prisma.vaccines.findMany({
      orderBy: { vaccine_name: 'asc' },
    });
  }
}
