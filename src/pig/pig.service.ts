import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PigDashboardStatsDto, PenItemDto } from './pig.dto';
import dayjs from 'dayjs';

@Injectable()
export class PigService {
  constructor(private prisma: PrismaService) {}

  async findByPen(penId: string) {
    return (this.prisma as any).pigs.findMany({
      where: { 
        pen_id: penId,
        pig_statuses: {
          status_name: {
            contains: 'Khoẻ',
            mode: 'insensitive'
          }
        }
      },
      include: { 
        pig_breeds: true,
        pig_statuses: true 
      },
    });
  }

  async findByBreed(breedId: string) {
    return (this.prisma as any).pigs.findMany({
      where: {
        pig_batch_id: breedId,
      },
      include: {
        pens: true,
        pig_statuses: true,
      },
    });
  }

  async getArrivalDateByPen(penId: string) {
    const penInfo = await (this.prisma as any).pens.findUnique({
      where: { id: penId },
      select: {
        pigs: {
          take: 1,
          select: {
            pig_batchs: {
              select: {
                batch_name: true,
                arrival_date: true,
              },
            },
          },
        },
      },
    });

    return penInfo?.pigs[0]?.pig_batchs || null;
  }

  async getExportProposals() {
  const today = new Date();

  const allPens = await (this.prisma as any).pens.findMany({
    include: {
      pigs: {
        include: {
          pig_batchs: true,
          pig_breeds: true,
        },
      },
    },
  });

  return allPens
    .map((pen) => {
      if (!pen.pigs.length) return null;

      const firstPig = pen.pigs[0];
      const arrivalDate = firstPig?.pig_batchs?.arrival_date;
      const breedName = firstPig?.pig_breeds?.breed_name || "N/A"; 
      const quantity = pen.pigs.length;

      if (!arrivalDate) return null;

      const expectedDate = new Date(arrivalDate);
      expectedDate.setDate(expectedDate.getDate() + 150); 

      const notificationDate = new Date(expectedDate);
      notificationDate.setDate(notificationDate.getDate() - 45);

      const rawWeight = pen.pigs.reduce((sum, pig) => sum + (pig.weight || 0), 0);
      const totalWeight = Math.round(rawWeight * 10) / 10;

      return {
        pen_name: pen.pen_name,
        quantity: quantity,    
        breed: breedName,
        total_weight: totalWeight, 
        arrival_date: arrivalDate,
        expected_date: expectedDate,
        notification_date: notificationDate,
        current_price: 60000,
        };
      })
      .filter((item) => {
        return item !== null && today >= item.notification_date;
      });
  }

  async findAllBreeds() {
    const breeds = await this.prisma.pig_breeds.findMany({
      include: {
        _count: {
          select: { pigs: true }, 
        },
      },
      orderBy: { breed_name: 'asc' },
    });

    return breeds.map((b) => ({
      id: b.id,
      breed_name: b.breed_name,
      hasPigs: b._count.pigs > 0, 
    }));
  }

  async createBreed(data: { breed_name: string }) {
    const existing = await this.prisma.pig_breeds.findFirst({
      where: { breed_name: data.breed_name },
    });

    if (existing) {
      throw new BadRequestException('Giống heo này đã tồn tại trong hệ thống');
    }

    return this.prisma.pig_breeds.create({
      data: { breed_name: data.breed_name },
    });
  }

  async removeBreeds(ids: string[]) {
    const breedsInUse = await this.prisma.pig_breeds.findMany({
      where: {
        id: { in: ids },
        pigs: { some: {} },
      },
      select: { breed_name: true },
    });

    if (breedsInUse.length > 0) {
      const names = breedsInUse.map((b) => b.breed_name).join(', ');
      throw new BadRequestException(
        `Không thể xóa giống heo: [${names}] vì đang có heo thuộc giống này.`,
      );
    }

    return this.prisma.pig_breeds.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async update(id: string, data: { breed_name: string }) {
    try {
      return await this.prisma.pig_breeds.update({
        where: { id },
        data: {
          breed_name: data.breed_name,
        },
      });
    } catch (error) {
      console.error("Lỗi Prisma (Breeds):", error.message);
      throw new BadRequestException("Không thể cập nhật giống heo");
    }
  }
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
    // UPDATED: Query pens directly where current_quantity > 0
    const activePensData = await this.prisma.pens.findMany({
      where: { current_quantity: { gt: 0 } },
    });

    // Sum active pigs from pens table
    const totalPigs = activePensData.reduce((sum, pen) => sum + (pen.current_quantity || 0), 0);
    const activePensCount = activePensData.length;

    const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();

    // UPDATED: Count pigs directly via pig_batchs arrival date
    const newPigsCount = await this.prisma.pigs.count({
      where: {
        pig_batchs: {
          arrival_date: { gte: sevenDaysAgo }
        }
      }
    });

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
    // UPDATED: Get pens directly, trust current_quantity column
    const pens = await this.prisma.pens.findMany({
      orderBy: { pen_name: 'asc' } 
    });

    return pens.map((pen) => {
      // UPDATED: Use current_quantity from pens table
      const currentPigs = pen.current_quantity || 0;

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