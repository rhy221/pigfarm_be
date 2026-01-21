import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class ChemicalsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const chemicals = await this.prisma.chemicals.findMany({
      include: {
        _count: {
          select: { cleaning_details: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return chemicals.map(c => ({
      id: c.id,
      name: c.name,
      hasHistory: c._count.cleaning_details > 0 
    }));
  }

  async create(data: { name: string }) {
    const existing = await this.prisma.chemicals.findFirst({
        where: { 
        name: { 
            equals: data.name, 
            mode: 'insensitive' 
        } 
        }
    });

    if (existing) {
        throw new BadRequestException(`Loại hóa chất "${data.name}" đã tồn tại trong hệ thống.`);
    }

    return this.prisma.chemicals.create({
        data: { name: data.name }
    });
    }

  async update(id: string, data: { name: string }) {
    return this.prisma.chemicals.update({
      where: { id },
      data: { name: data.name }
    });
  }

  async removeMany(ids: string[]) {
    const inUse = await this.prisma.cleaning_details.findFirst({
      where: { chemical_id: { in: ids } }
    });

    if (inUse) {
      throw new BadRequestException('Không thể xóa hóa chất đã có trong lịch sử vệ sinh!');
    }

    return this.prisma.chemicals.deleteMany({
      where: { id: { in: ids } }
    });
  }
}