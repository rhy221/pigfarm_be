import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FacilityService {
  constructor(private prisma: PrismaService) {}

  async getPensGroupedByBreed() {
    try {
      const healthyStatus = await (this.prisma as any).pig_statuses.findFirst({
        where: {
          status_name: {
            contains: 'Khoẻ', 
            mode: 'insensitive',
          },
        },
      });

      if (!healthyStatus) {
        console.error('Không tìm thấy trạng thái "Khoẻ" trong bảng pig_statuses');
        return {};
      }

      const pens = await (this.prisma as any).pens.findMany({
        where: {
          pigs: {
            some: {
              pig_status_id: healthyStatus.id,
            },
          },
        },
        include: {
          pigs: {
            where: {
              pig_status_id: healthyStatus.id,
            },
            include: {
              pig_breeds: true, 
            },
          },
        },
      });

      if (!pens || pens.length === 0) return {};

      return pens.reduce((acc: any, pen: any) => {
        const breedName = pen.pigs?.[0]?.pig_breeds?.breed_name || 'Giống chưa xác định';

        if (!acc[breedName]) {
          acc[breedName] = [];
        }

        const isExist = acc[breedName].some((item: any) => item.id === pen.id);
        if (!isExist) {
          acc[breedName].push({
            id: pen.id,
            pen_name: pen.pen_name,
            current_pigs: pen.pigs.length,
          });
        }

        return acc;
      }, {});
    } catch (error) {
      console.error('Lỗi lấy danh sách chuồng:', error);
      throw new InternalServerErrorException('Không thể lọc danh sách chuồng xuất');
    }
  }
}