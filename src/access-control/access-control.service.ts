import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePermissionDto } from './access-control.dto';

@Injectable()
export class AccessControlService {
  constructor(private prisma: PrismaService) {}

  private readonly defaultPermissions = {
    HEO_CHUONG: false,
    VAC_XIN: false,
    HEO_BENH: false,
    XUAT_CHUONG: false,
    KHO: false,
    KHAU_PHAN: false,
    VE_SINH: false,
    CHI_PHI: false,
    PHAN_CONG: false,
    BAO_CAO: false,
    SETTINGS: false,
    LOGOUT: true,
  };

  async findAll() {
    const userGroups = await this.prisma.user_group.findMany();

    await Promise.all(
      userGroups.map((group) =>
        this.prisma.access_control.upsert({
          where: { role_id: group.id },
          update: {}, 
          create: {
            role_id: group.id,
            permissions: this.defaultPermissions, 
          },
        })
      )
    );

    return this.prisma.access_control.findMany({
      include: {
        user_group: {
          select: { name: true }
        }
      },
      orderBy: { created_at: 'asc' }
    });
  }

  async update(roleId: string, updateDto: UpdatePermissionDto) {
    const access = await this.prisma.access_control.findUnique({
      where: { role_id: roleId },
    });

    const currentPermissions = (access?.permissions as Record<string, boolean>) || this.defaultPermissions;
    
    const updatedPermissions = {
      ...currentPermissions,
      [updateDto.moduleKey]: updateDto.value,
    };

    return this.prisma.access_control.upsert({
      where: { role_id: roleId },
      update: { permissions: updatedPermissions },
      create: {
        role_id: roleId,
        permissions: { ...this.defaultPermissions, [updateDto.moduleKey]: updateDto.value },
      },
    });
  }
}