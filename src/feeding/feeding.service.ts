import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedingFormulaDto, UpdateFeedingFormulaDto } from './feeding.dto';
import dayjs from 'dayjs';

@Injectable()
export class FeedingService {
  constructor(private prisma: PrismaService) {}

  async createFormula(data: CreateFeedingFormulaDto) {
    return this.prisma.feeding_formulas.create({
      data: {
        name: data.name,
        start_day: data.startDay,
        amount_per_pig: data.amountPerPig,
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

  async deleteFormula(id: string) {
    return this.prisma.feeding_formulas.delete({ where: { id } });
  }

  async getFeedingPlan(batchId: string) {
    const batch = await this.prisma.pig_batches.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Không tìm thấy lứa heo');

    const batchPens = await this.prisma.pens.findMany({
      where: { pigs: { some: { pig_batch_id: batchId } } },
    });

    const today = dayjs();
    const arrival = dayjs(batch.arrival_date);
    const currentDaysOld = today.diff(arrival, 'day');

    const timeline: any[] = [];
    const BLOCKS = 6;
    
    for (let i = 0; i < BLOCKS; i++) {
        const start = i * 30;
        const end = (i + 1) * 30 - 1;
        
        let status = 'future';
        if (currentDaysOld > end) status = 'past';
        else if (currentDaysOld >= start && currentDaysOld <= end) status = 'current';

        timeline.push({
            label: `Tháng ${i + 1}`,
            desc: `${start} - ${end} ngày`,
            startDay: start,
            endDay: end,
            isCurrent: status === 'current',
            status: status
        });
    }

    const details: any[] = [];
    
    const allFormulas = await this.prisma.feeding_formulas.findMany({
        orderBy: { start_day: 'desc' }, 
        include: {
            feeding_formula_details: { include: { products: true } }
        }
    });

    const currentFormula = allFormulas.find(f => f.start_day <= currentDaysOld);

    if (currentFormula) {
        const ingredientsText = currentFormula.feeding_formula_details
            .map(d => `${d.products?.name} (${d.percentage}%)`)
            .join(' + ');

        for (const pen of batchPens) {
            const pigCount = pen.current_quantity || 0;
            if (pigCount <= 0) continue;

            const totalFeedKg = (currentFormula.amount_per_pig * pigCount) / 1000;
            const ingredientsBreakdown = currentFormula.feeding_formula_details.map((detail) => {
                const amountNeeded = (totalFeedKg * Number(detail.percentage)) / 100;
                return {
                    productName: detail.products?.name,
                    ratio: `${detail.percentage}%`,
                    amountNeeded: `${amountNeeded.toFixed(2)} kg`,
                };
            });

            details.push({
                penName: pen.pen_name,
                formulaName: currentFormula.name,
                ingredientsText: ingredientsText,
                pigCount: pigCount,
                amountPerPig: currentFormula.amount_per_pig,
                totalFeedAmount: `${totalFeedKg.toFixed(1)} kg`,
                ingredients: ingredientsBreakdown,
            });
        }
    }

    return { timeline, details };
  }

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
        start_day: data.startDay,
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