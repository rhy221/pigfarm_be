import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PigService {
  constructor(private prisma: PrismaService) {}

  async findByPen(penId: string) {
    const healthyStatus = await (this.prisma as any).pig_statuses.findFirst({
      where: {
        status_name: {
          contains: 'Khoẻ',
          mode: 'insensitive',
        },
      },
    });

    return (this.prisma as any).pigs.findMany({
      where: {
        pen_id: penId,
        pig_status_id: healthyStatus?.id,
      },
      include: {
        pig_breeds: true,
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
        expectedDate.setDate(expectedDate.getDate() + 180);

        const notificationDate = new Date(expectedDate);
        notificationDate.setDate(notificationDate.getDate() - 30);

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
}