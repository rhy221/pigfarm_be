import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleaningMethodsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const methods = await this.prisma.cleaning_methods.findMany({
      include: {
        _count: {
          select: { cleaning_details: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return methods.map(m => ({
      id: m.id,
      name: m.name,
      hasHistory: m._count.cleaning_details > 0
    }));
  }

  async create(data: { name: string }) {
    const existing = await this.prisma.cleaning_methods.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } }
    });

    if (existing) {
      throw new BadRequestException(`Hình thức vệ sinh "${data.name}" đã tồn tại.`);
    }

    return this.prisma.cleaning_methods.create({
      data: { name: data.name }
    });
  }

  async update(id: string, data: { name: string }) {
    return await this.prisma.cleaning_methods.update({
      where: { id },
      data: { name: data.name }
    });
  }

  async removeMany(ids: string[]) {
    const inUse = await this.prisma.cleaning_details.findFirst({
      where: { method_id: { in: ids } }
    });

    if (inUse) {
      throw new BadRequestException('Không thể xóa hình thức vệ sinh đã được sử dụng trong lịch sử.');
    }

    return this.prisma.cleaning_methods.deleteMany({
      where: { id: { in: ids } }
    });
  }
}