import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiseasesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const diseases = await this.prisma.diseases.findMany({
      include: {
        _count: {
          select: {
            disease_treatments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return diseases.map((d) => ({
      ...d,
      hasHistory: d._count.disease_treatments > 0,
    }));
  }

  async create(data: { name: string }) {
    const existing = await this.prisma.diseases.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new BadRequestException(`Bệnh "${data.name}" đã tồn tại.`);
    }

    return this.prisma.diseases.create({
      data: { name: data.name },
    });
  }

  async update(id: string, data: { name: string }) {
    console.log('Update ID:', id, 'Data:', data); 
    
    return await this.prisma.diseases.update({
      where: { id: id }, 
      data: {
        name: data.name,
      },
    });
  }

  async removeMany(ids: string[]) {
    const inUse = await this.prisma.diseases.findMany({
      where: {
        id: { in: ids },
        OR: [
          { disease_treatments: { some: {} } },
          { vaccine_report_details: { some: {} } }
        ]
      },
      select: { name: true }
    });

    if (inUse.length > 0) {
      const names = inUse.map(d => d.name).join(', ');
      throw new BadRequestException(`Không thể xóa: [${names}] vì đang có dữ liệu điều trị hoặc tiêm chủng liên quan.`);
    }

    return this.prisma.diseases.deleteMany({
      where: { id: { in: ids } },
    });
  }
}