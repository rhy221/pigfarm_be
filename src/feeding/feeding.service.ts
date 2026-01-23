import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedingFormulaDto, UpdateFeedingFormulaDto } from './feeding.dto';
import dayjs from 'dayjs';

@Injectable()
export class FeedingService {
  constructor(private prisma: PrismaService) {}

  async createFormula(data: CreateFeedingFormulaDto) {
    
    const productIds = data.items.map((item) => item.productId);

    const invalidProductsCount = await this.prisma.products.count({
      where: {
        id: { in: productIds },
        warehouse_categories: {
          type: { not: 'feed' } 
        }
      }
    });

    if (invalidProductsCount > 0) {
      throw new BadRequestException('Công thức chỉ được chứa sản phẩm thuộc loại Thức ăn chăn nuôi (feed)!');
    }
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

  async getFeedingPlan(batchId: string, stageQuery?: number) { 
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
    let currentStageIndex = 0; 
    
    for (let i = 0; i < BLOCKS; i++) {
        const start = i * 30;
        const end = (i + 1) * 30 - 1;
        
        let status = 'future';
        if (currentDaysOld > end) status = 'past';
        else if (currentDaysOld >= start && currentDaysOld <= end) {
            status = 'current';
            currentStageIndex = i;
        }

        timeline.push({
            stageIndex: i, 
            label: `Tháng ${i + 1}`,
            desc: `${start} - ${end} ngày`,
            startDay: start,
            endDay: end,
            isCurrent: status === 'current', 
            status: status
        });
    }

    const targetStageIndex = stageQuery !== undefined ? Number(stageQuery) : currentStageIndex;
    
    const targetDaysOld = targetStageIndex * 30;

    const details: any[] = [];
    
    const allFormulas = await this.prisma.feeding_formulas.findMany({
        orderBy: { start_day: 'desc' }, 
        include: {
            feeding_formula_details: { include: { products: true } }
        }
    });

    const targetFormula = allFormulas.find(f => f.start_day <= targetDaysOld);

    if (targetFormula) {
        const ingredientsText = targetFormula.feeding_formula_details
            .map(d => `${d.products?.name} (${d.percentage}%)`)
            .join(' + ');

        for (const pen of batchPens) {
            const pigCount = pen.current_quantity || 0;
            if (pigCount <= 0) continue;

            const dailyFeedKg = (targetFormula.amount_per_pig * pigCount) / 1000;
            
            const stageTotalKg = dailyFeedKg * 30;

            const ingredientsBreakdown = targetFormula.feeding_formula_details.map((detail) => {
                const amountNeededDaily = (dailyFeedKg * Number(detail.percentage)) / 100;
                return {
                    productName: detail.products?.name,
                    ratio: `${detail.percentage}%`,
                    amountNeeded: `${amountNeededDaily.toFixed(2)} kg`, 
                };
            });

            details.push({
                penName: pen.pen_name,
                formulaName: targetFormula.name,
                ingredientsText: ingredientsText,
                pigCount: pigCount,
                amountPerPig: targetFormula.amount_per_pig, 
                dailyTotalAmount: `${dailyFeedKg.toFixed(1)} kg`, 
                stageTotalAmount: `${stageTotalKg.toFixed(1)} kg`,
                ingredients: ingredientsBreakdown,
            });
        }
    }

    return { timeline, details, selectedStage: targetStageIndex };
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