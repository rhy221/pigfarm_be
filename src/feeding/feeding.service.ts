import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedingFormulaDto, UpdateFeedingFormulaDto } from './feeding.dto';
import dayjs from 'dayjs';

@Injectable()
export class FeedingService {
  constructor(private prisma: PrismaService) {}

  // ========================================================
  // 1. TẠO CÔNG THỨC (CÓ LIÊN KẾT KHO)
  // ========================================================
  async createFormula(data: CreateFeedingFormulaDto) {
    return this.prisma.feeding_formulas.create({
      data: {
        name: data.name,
        stage_name: data.stageName,
        start_day: data.startDay,
        end_day: data.endDay,
        amount_per_pig: data.amountPerPig,
        ingredients: '', 
        feeding_formula_details: {
          create: data.items.map((item) => ({
            product_id: item.productId,
            percentage: item.percentage,
          })),
        },
      },
      include: {
        feeding_formula_details: true,
      },
    });
  }

  // ========================================================
  // 2. LẤY DANH SÁCH CÔNG THỨC (JOIN VỚI PRODUCTS)
  // ========================================================
  async getFormulas() {
    const formulas = await this.prisma.feeding_formulas.findMany({
      orderBy: { start_day: 'asc' },
      include: {
        feeding_formula_details: {
          include: {
            products: true,
          },
        },
      },
    });

    return formulas.map((f) => {
      const ingredientsText = f.feeding_formula_details
        .map((d) => `${d.products?.name || 'Unknown'} (${d.percentage}%)`)
        .join(' + ');

      return {
        ...f,
        ingredients: ingredientsText, 
        details: f.feeding_formula_details.map((d) => ({
          productId: d.product_id,
          productName: d.products?.name,
          percentage: d.percentage,
        })),
      };
    });
  }

  // ========================================================
  // 3. XÓA CÔNG THỨC
  // ========================================================
  async deleteFormula(id: string) {
    return this.prisma.feeding_formulas.delete({ where: { id } });
  }

  // ========================================================
  // 4. LẬP KẾ HOẠCH CHO ĂN (TÍNH TOÁN CHI TIẾT)
  // ========================================================
  async getFeedingPlan(batchId: string, selectedStageId?: string) {
    const batch = await this.prisma.pig_batches.findUnique({
      where: { id: batchId },
    });
    if (!batch) throw new NotFoundException('Không tìm thấy lứa heo');

    const batchPens = await this.prisma.pens.findMany({
      where: {
        pigs: { some: { pig_batch_id: batchId } },
      },
    });

    const today = dayjs();
    const arrival = dayjs(batch.arrival_date);
    const currentDaysOld = today.diff(arrival, 'day');

    const allFormulas = await this.prisma.feeding_formulas.findMany({
      orderBy: { start_day: 'asc' },
    });

    const uniqueStagesMap = new Map();
    allFormulas.forEach((f) => {
      const key = `${f.start_day}-${f.end_day}`;
      if (!uniqueStagesMap.has(key)) {
        uniqueStagesMap.set(key, {
          id: f.id, 
          name: f.stage_name,
          start: f.start_day,
          end: f.end_day,
        });
      }
    });

    const timeline = Array.from(uniqueStagesMap.values()).map((stage: any, index) => {
      const isCurrentTime = currentDaysOld >= stage.start && currentDaysOld <= stage.end;
      let status = 'future';
      if (currentDaysOld > stage.end) status = 'past';
      if (isCurrentTime) status = 'current';

      return {
        id: stage.id,
        shortName: `GĐ ${index + 1}`,
        fullName: `${stage.name} (${stage.start} - ${stage.end} ngày)`,
        startDay: stage.start,
        endDay: stage.end,
        isCurrent: isCurrentTime,
        status: status,
      };
    });

    let targetStage: any = null;
    if (selectedStageId) {
      targetStage = timeline.find((t) => t.id === selectedStageId);
    }
    if (!targetStage) {
      targetStage = timeline.find((t) => t.isCurrent); 
    }
    if (!targetStage && timeline.length > 0) {
      targetStage = timeline[0]; 
    }

    const details: any[] = [];

    if (targetStage) {
      const applicableFormulas = await this.prisma.feeding_formulas.findMany({
        where: {
          start_day: targetStage.startDay,
          end_day: targetStage.endDay,
        },
        include: {
          feeding_formula_details: {
            include: { products: true }, 
          },
        },
      });

      for (const pen of batchPens) {
        const pigCount = pen.current_quantity || 0;
        if (pigCount <= 0) continue;

        for (const formula of applicableFormulas) {
          const totalFeedKg = (formula.amount_per_pig * pigCount) / 1000;

          const ingredientsText = formula.feeding_formula_details
            .map(d => `${d.products?.name} (${d.percentage}%)`)
            .join(' + ');

          const ingredientsBreakdown = formula.feeding_formula_details.map((detail) => {
            const amountNeeded = (totalFeedKg * Number(detail.percentage)) / 100;
            
            return {
              productName: detail.products?.name || 'Unknown Product',
              ratio: `${detail.percentage}%`,
              amountNeeded: `${amountNeeded.toFixed(2)} kg`,
            };
          });

          details.push({
            penName: pen.pen_name || 'Unknown',
            formulaName: formula.name,
            ingredientsText: ingredientsText,
            pigCount: pigCount,
            amountPerPig: formula.amount_per_pig,
            totalFeedAmount: `${totalFeedKg.toFixed(1)} kg`,
            ingredients: ingredientsBreakdown, 
          });
        }
      }
    }

    return {
      timeline,
      details,
    };
  }

  // ========================================================
  // 5. CẬP NHẬT CÔNG THỨC (UPDATE)
  // ========================================================
  async updateFormula(id: string, data: UpdateFeedingFormulaDto) {
    const existing = await this.prisma.feeding_formulas.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy công thức');

    const formulaDetailsUpdate = data.items
      ? {
          deleteMany: {}, 
          create: data.items.map((item) => ({ 
            product_id: item.productId,
            percentage: item.percentage,
          })),
        }
      : undefined;

    return this.prisma.feeding_formulas.update({
      where: { id },
      data: {
        name: data.name,
        stage_name: data.stageName,
        start_day: data.startDay,
        end_day: data.endDay,
        amount_per_pig: data.amountPerPig,
        
        feeding_formula_details: formulaDetailsUpdate,
      },
      include: {
        feeding_formula_details: {
          include: { products: true },
        },
      },
    });
  }
}