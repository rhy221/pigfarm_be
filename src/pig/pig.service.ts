import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PigDashboardStatsDto, PenItemDto } from './pig.dto';
import dayjs from 'dayjs';

@Injectable()
export class PigService {
  constructor(private prisma: PrismaService) {}

  private readonly LIMITS = {
    temp: { min: 25, max: 38, warning: 33, danger: 36 },
    humidity: { min: 60, max: 95, warning: 85, danger: 90 },
  };


  private simulateEnvironment() {
    const temp =
      Math.random() * (this.LIMITS.temp.max - this.LIMITS.temp.min) +
      this.LIMITS.temp.min;
    
    const hum =
      Math.random() * (this.LIMITS.humidity.max - this.LIMITS.humidity.min) +
      this.LIMITS.humidity.min;

    return {
      temperature: parseFloat(temp.toFixed(1)),
      humidity: Math.floor(hum),
    };
  }

  async getDashboardStats(): Promise<PigDashboardStatsDto> {
    const activeBatches = await this.prisma.rearing_pens.findMany({
      where: { quantity: { gt: 0 } },
    });

    const totalPigs = activeBatches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
    
    const activePensList = [...new Set(activeBatches.map((b) => b.pen_id))];
    const activePensCount = activePensList.length;

    const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();
    const newBatches = await this.prisma.rearing_pens.findMany({
      where: {
        pig_batchs: { arrival_date: { gte: sevenDaysAgo } },
      },
    });
    const newPigsCount = newBatches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);

    let overheatedCount = 0;
    let highHumidityCount = 0;

    for (let i = 0; i < activePensCount; i++) {
      const env = this.simulateEnvironment();
      if (env.temperature >= this.LIMITS.temp.warning) overheatedCount++;
      if (env.humidity >= this.LIMITS.humidity.warning) highHumidityCount++;
    }

    return {
      totalPigs,
      activePens: activePensCount,
      overheatedPens: overheatedCount,
      highHumidityPens: highHumidityCount,
      newPigs7Days: newPigsCount,
    };
  }

  async getPenList(): Promise<PenItemDto[]> {
    const pens = await this.prisma.pens.findMany({
      include: {
        rearing_pens: {
          where: { quantity: { gt: 0 } },
          select: { quantity: true },
        },
      },
      orderBy: { pen_name: 'asc' } 
    });

    return pens.map((pen) => {
      const currentPigs = pen.rearing_pens.reduce((sum, rp) => sum + (rp.quantity || 0), 0);

      const env = this.simulateEnvironment();

      let status = 'normal';
      let statusLabel = 'Bình thường';
      let color = 'green'; 

      if (env.temperature >= this.LIMITS.temp.danger) {
        status = 'danger';
        statusLabel = 'Nguy hiểm';
        color = 'red';
      } else if (
        env.temperature >= this.LIMITS.temp.warning ||
        env.humidity >= this.LIMITS.humidity.warning
      ) {
        status = 'warning';
        statusLabel = 'Cảnh báo';
        color = 'orange'; 
      }

      return {
        id: pen.id,
        name: pen.pen_name || 'Không tên',
        currentPigs: currentPigs,
        capacity: pen.capacity || 100, 
        temperature: env.temperature,
        humidity: env.humidity,
        status,
        statusLabel,
        color,
      };
    });
  }
}