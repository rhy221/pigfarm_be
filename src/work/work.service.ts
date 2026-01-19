import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const shifts = await this.prisma.work_shifts.findMany({
        include: {
        _count: {
            select: { assignment_details: true }
        }
        },
        orderBy: { start_time: 'asc' }
    });

    return shifts.map(s => {
        const formatTime = (date: Date | null) => {
        if (!date) return "00:00";

        const isoString = date.toISOString(); 
        return isoString.slice(11, 16); 
        };

        return {
        id: s.id,
        session: s.session,
        start_time: formatTime(s.start_time),
        end_time: formatTime(s.end_time),
        hasAssignments: s._count.assignment_details > 0
        };
    });
  }

  async create(data: { session: string; start_time: string; end_time: string }) {
    const existing = await this.prisma.work_shifts.findFirst({
        where: { session: { equals: data.session, mode: 'insensitive' } }
    });

    if (existing) {
        throw new BadRequestException(`Ca làm "${data.session}" đã tồn tại.`);
    }

    return this.prisma.work_shifts.create({
        data: {
        session: data.session,
        start_time: `${data.start_time}:00+07`,
        end_time: `${data.end_time}:00+07`,
        }
    });
    }

  async update(id: string, data: any) {
    const updateData: any = {};
    
    if (data.session !== undefined) updateData.session = data.session;

    if (data.start_time) {
      updateData.start_time = new Date(`1970-01-01T${data.start_time}:00Z`);
    }
    
    if (data.end_time) {
      updateData.end_time = new Date(`1970-01-01T${data.end_time}:00Z`);
    }

    try {
      return await this.prisma.work_shifts.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error('Update Error:', error.message);
      throw new BadRequestException('Không thể cập nhật ca làm. Vui lòng kiểm tra lại định dạng dữ liệu.');
    }
  }

  async removeMany(ids: string[]) {
    const inUse = await this.prisma.assignment_details.findFirst({
      where: { shift_id: { in: ids } }
    });

    if (inUse) {
      throw new BadRequestException('Không thể xóa ca làm đã được phân công công việc.');
    }

    return this.prisma.work_shifts.deleteMany({
      where: { id: { in: ids } }
    });
  }
}