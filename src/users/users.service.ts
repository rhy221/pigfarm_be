import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.users.findMany({
      include: { 
        user_group: true 
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: CreateUserDto) {
    return this.prisma.users.create({
      data: {
        full_name: data.full_name,
        email: data.email,
        password_hash: data.password_hash,
        phone: data.phone,
        role_id: data.role_id, 
        is_active: true,
      },
      include: { user_group: true },
    });
  }

  async removeMany(ids: string[]) {
    return this.prisma.users.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.users.update({
      where: { id },
      data: data,
      include: { user_group: true },
    });
  }
}