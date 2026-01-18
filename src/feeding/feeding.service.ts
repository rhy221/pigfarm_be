import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedingFormulaDto } from './feeding.dto';
import dayjs from 'dayjs';

@Injectable()
export class FeedingService {
  constructor(private prisma: PrismaService) {}

  async createFormula(data: CreateFeedingFormulaDto) {
    return this.prisma.feeding_formulas.create({
      data: {
        name: data.name,
        stage_name: data.stageName,
        start_day: data.startDay,
        end_day: data.endDay,
        amount_per_pig: data.amountPerPig,
        ingredients: data.ingredients,
      },
    });
  }

  async getFormulas() {
    return this.prisma.feeding_formulas.findMany({
      orderBy: { start_day: 'asc' },
    });
  }

  async deleteFormula(id: string) {
    return this.prisma.feeding_formulas.delete({ where: { id } });
  }

  async getFeedingPlan(batchId: string, selectedStageId?: string) {
    const batch = await this.prisma.pig_batches.findUnique({
      where: { id: batchId },
      include: {
        rearing_pens: {
            include: { pens: true }
        }
      }
    });

    if (!batch) throw new NotFoundException('Không tìm thấy lứa heo');

    const today = dayjs();
    const arrival = dayjs(batch.arrival_date);
    const currentDaysOld = today.diff(arrival, 'day');

    const formulas = await this.prisma.feeding_formulas.findMany({
      orderBy: { start_day: 'asc' },
    });

    const uniqueStagesMap = new Map();
    
    formulas.forEach(f => {
        const key = `${f.start_day}-${f.end_day}`;
        if (!uniqueStagesMap.has(key)) {
            uniqueStagesMap.set(key, {
                id: f.id,
                name: f.stage_name,
                start: f.start_day,
                end: f.end_day
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
            status: status
        };
    });

    let targetStage: any = null;

    if (selectedStageId) {
        const found = timeline.find(t => t.id === selectedStageId);
        if (found) targetStage = found;
    } 
    
    if (!targetStage) {
        targetStage = timeline.find(t => t.isCurrent);
    }
    
    if (!targetStage && timeline.length > 0) {
        targetStage = timeline[0];
    }

    const details: any[] = [];

    if (targetStage) {
        const applicableFormulas = formulas.filter(
            f => f.start_day === targetStage.startDay && f.end_day === targetStage.endDay
        );

        for (const rearingPen of batch.rearing_pens) {
            const pigCount = rearingPen.quantity || 0;
            if (pigCount <= 0) continue;

            for (const formula of applicableFormulas) {
                const totalKg = (formula.amount_per_pig * pigCount) / 1000;

                details.push({
                    penName: rearingPen.pens?.pen_name || 'Unknown',
                    formulaName: formula.name,
                    ingredients: formula.ingredients,
                    pigCount: pigCount,
                    amountPerPig: formula.amount_per_pig,
                    totalAmountLabel: `${totalKg.toFixed(1)} kg`,
                });
            }
        }
    }

    return {
        timeline,
        details
    };
  }
}