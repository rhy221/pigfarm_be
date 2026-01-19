import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class PensService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.pens.findMany({
      include: {
        pen_types: true,
        pigs: { select: { id: true } }
      },
      orderBy: { pen_name: 'asc' }
    });
  }

  async create(data: { pen_name: string; pen_type_id: string }) {
    const existingPen = await this.prisma.pens.findFirst({
      where: { pen_name: data.pen_name },
    });

    if (existingPen) {
      throw new BadRequestException(`Tên chuồng "${data.pen_name}" đã tồn tại!`);
    }

    return this.prisma.pens.create({
      data: {
        pen_name: data.pen_name,
        pen_type_id: data.pen_type_id,
      },
    });
  }

  async removeMany(ids: string[]) {
    const pensWithPigs = await this.prisma.pens.findMany({
      where: {
        id: { in: ids },
        pigs: { some: {} }, 
      },
      select: { pen_name: true },
    });

    if (pensWithPigs.length > 0) {
      const names = pensWithPigs.map((p) => p.pen_name).join(', ');
      throw new BadRequestException(
        `Không thể xóa vì các chuồng sau đang có heo: ${names}`,
      );
    }

    return this.prisma.pens.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async findAllTypes() {
    const types = await this.prisma.pen_types.findMany({
      include: {
        _count: {
          select: {
            pens: {
              where: {
                pigs: { some: {} } 
              }
            }
          }
        },
        pens: {
          select: {
            _count: {
              select: { pigs: true }
            }
          }
        }
      },
      orderBy: { pen_type_name: 'asc' },
    });

    return types.map(t => {
      const totalPigs = t.pens.reduce((sum, pen) => sum + pen._count.pigs, 0);
      return {
        ...t,
        hasPigs: totalPigs > 0
      };
    });
  }

  async createType(data: { pen_type_name: string }) {
    const existingType = await this.prisma.pen_types.findFirst({
      where: { pen_type_name: data.pen_type_name },
    });

    if (existingType) {
      throw new BadRequestException(`Loại chuồng "${data.pen_type_name}" đã tồn tại!`);
    }

    return this.prisma.pen_types.create({
      data: {
        pen_type_name: data.pen_type_name,
      },
    });
  }

  async update(id: string, data: { pen_name?: string; pen_type_id?: string }) {
    try {
      return await this.prisma.pens.update({
        where: { id },
        data: {
          ...(data.pen_name && { pen_name: data.pen_name }),
          ...(data.pen_type_id && { pen_type_id: data.pen_type_id }),
        },
      });
    } catch (error) {
      console.error("Prisma Update Error:", error.message);
      throw new BadRequestException("Không thể cập nhật chuồng, vui lòng kiểm tra dữ liệu");
    }
  }

  async removeTypes(ids: string[]) {

    const typesInUse = await this.prisma.pen_types.findMany({
      where: {
        id: { in: ids },
        pens: { some: {} }, 
      },
      select: { pen_type_name: true },
    });

    if (typesInUse.length > 0) {
      const names = typesInUse.map((t) => t.pen_type_name).join(', ');
      throw new BadRequestException(
        `Không thể xóa loại chuồng: [${names}] vì đang có chuồng trại thuộc loại này.`,
      );
    }

    return this.prisma.pen_types.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }

  async updateType(id: string, data: { pen_type_name: string }) {
    return this.prisma.pen_types.update({
      where: { id },
      data: {
        pen_type_name: data.pen_type_name,
      },
    });
  }
}