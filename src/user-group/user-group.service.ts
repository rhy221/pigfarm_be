import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserGroupService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const groups = await this.prisma.user_group.findMany({
      orderBy: { id: 'asc' },
    });
    return groups.map((g) => ({
      ...g,
      id: g.id.toString(), // Convert BigInt to String cho JSON
    }));
  }

  async create(data: { name: string }) {
    const existing = await this.prisma.user_group.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException(`Nhóm "${data.name}" đã tồn tại.`);
    }

    const result = await this.prisma.user_group.create({
      data: { name: data.name },
    });
    return { ...result, id: result.id.toString() };
  }

  async update(id: string, data: { name: string }) {
    try {
        const result = await this.prisma.user_group.update({
        where: { id: id },
        data: { name: data.name },
        });
        return { ...result, id: result.id.toString() };
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