import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VaccinesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vaccines.findMany({
      orderBy: { vaccine_name: 'asc' },
    });
  }

  async create(data: { 
    vaccine_name: string; 
    stage: number; 
    days_old: number; 
    dosage: string; 
    description: string 
  }) {
    const existing = await this.prisma.vaccines.findFirst({
      where: { vaccine_name: data.vaccine_name },
    });

    if (existing) {
      throw new BadRequestException(`Vắc-xin "${data.vaccine_name}" đã tồn tại trong hệ thống.`);
    }

    return this.prisma.vaccines.create({
      data: {
        vaccine_name: data.vaccine_name,
        stage: data.stage,
        days_old: data.days_old,
        dosage: data.dosage,
        description: data.description,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.vaccines.update({
      where: { id },
      data: {
        vaccine_name: data.vaccine_name,
        stage: data.stage,
        days_old: data.days_old,
        dosage: data.dosage,
        description: data.description,
      },
    });
  }

  async removeMany(ids: string[]) {
    const inUse = await this.prisma.vaccines.findMany({
      where: {
        id: { in: ids },
        OR: [
          { vaccination_schedule_details: { some: {} } },
          { vaccination_templates: { some: {} } },
          { vaccine_report_details: { some: {} } }
        ]
      },
      select: { vaccine_name: true }
    });

    if (inUse.length > 0) {
      const names = inUse.map(v => v.vaccine_name).join(', ');
      throw new BadRequestException(`Không thể xóa [${names}] vì đang có lịch tiêm hoặc báo cáo sử dụng loại vắc-xin này.`);
    }

    return this.prisma.vaccines.deleteMany({
      where: { id: { in: ids } },
    });
  }
}