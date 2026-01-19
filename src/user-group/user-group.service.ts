import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserGroupService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const groups = await this.prisma.user_group.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      hasUsers: g._count.users > 0,
    }));
  }

  async create(data: { name: string }) {
    const existing = await this.prisma.user_group.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException(`Nhóm "${data.name}" đã tồn tại.`);
    }

    return await this.prisma.user_group.create({
      data: { name: data.name },
    });
  }

  async update(id: string, data: { name: string }) {
    try {
      return await this.prisma.user_group.update({
        where: { id: id },
        data: { name: data.name },
      });
    } catch (error) {
      throw new BadRequestException('Lỗi: Không tìm thấy nhóm hoặc dữ liệu không hợp lệ.');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.user_group.delete({
        where: { id: id },
      });
    } catch (error) {
      throw new BadRequestException('Không thể xóa nhóm này.');
    }
  }
}