import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkRepository } from './work.repository';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto } from './dto';
import { Prisma } from '../generated/prisma/client';

type AssignmentDetailWithRelations = Prisma.assignment_detailsGetPayload<{
  include: {
    assignments: true;
    employees: true;
    pens: true;
    work_shifts: true;
  };
}>;

export interface TaskResponse {
  id: string;
  date: string | undefined;
  shift: string;
  barnId: string | null;
  barnName: string;
  employeeId: string | null;
  employeeName: string;
  taskType: string;
  taskDescription: string;
  status: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date | null;
}

@Injectable()
export class WorkShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const shifts = await this.prisma.work_shifts.findMany({
      include: {
        _count: {
          select: { assignment_details: true },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    return shifts.map((s) => {
      const formatTime = (date: Date | null) => {
        if (!date) return '00:00';

        const isoString = date.toISOString();
        return isoString.slice(11, 16);
      };

      return {
        id: s.id,
        session: s.session,
        start_time: formatTime(s.start_time),
        end_time: formatTime(s.end_time),
        hasAssignments: s._count.assignment_details > 0,
      };
    });
  }

  async create(data: {
    session: string;
    start_time: string;
    end_time: string;
  }) {
    const existing = await this.prisma.work_shifts.findFirst({
      where: { session: { equals: data.session, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException(`Ca làm "${data.session}" đã tồn tại.`);
    }

    return this.prisma.work_shifts.create({
      data: {
        session: data.session,
        start_time: `${data.start_time}:00+07`,
        end_time: `${data.end_time}:00+07`,
      },
    });
  }

  async update(
    id: string,
    data: { session?: string; start_time?: string; end_time?: string },
  ) {
    const updateData: Partial<{
      session: string;
      start_time: string;
      end_time: string;
    }> = {};

    if (data.session !== undefined) updateData.session = data.session;

    if (data.start_time) {
      updateData.start_time = `${data.start_time}:00+07`;
    }

    if (data.end_time) {
      updateData.end_time = `${data.end_time}:00+07`;
    }

    try {
      const result = await this.prisma.work_shifts.update({
        where: { id },
        data: updateData,
      });
      return result;
    } catch (error) {
      console.error(
        'Lỗi Supabase/Prisma:',
        error instanceof Error ? error.message : error,
      );
      throw new BadRequestException(
        'Không thể cập nhật dữ liệu lên Supabase. Kiểm tra lại định dạng giờ.',
      );
    }
  }

  async removeMany(ids: string[]) {
    const inUse = await this.prisma.assignment_details.findFirst({
      where: { shift_id: { in: ids } },
    });

    if (inUse) {
      throw new BadRequestException(
        'Không thể xóa ca làm đã được phân công công việc.',
      );
    }

    return this.prisma.work_shifts.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
export class WorkService {
  constructor(private readonly repo: WorkRepository) {}

  private mapToResponse(detail: AssignmentDetailWithRelations): TaskResponse {
    return {
      id: detail.id,
      date: detail.assignments?.assignment_date?.toISOString().split('T')[0],
      shift: detail.work_shifts?.session || '',
      barnId: detail.pen_id,
      barnName: detail.pens?.pen_name || '',
      employeeId: detail.employee_id,
      employeeName: detail.employees?.name || '',
      taskType: detail.task_type || 'other',
      taskDescription: detail.task_description || '',
      status: detail.status || 'pending',
      notes: detail.notes || '',
      createdAt: detail.created_at,
      updatedAt: detail.updated_at,
    };
  }

  async findAll(query: QueryTaskDto): Promise<TaskResponse[]> {
    const where: Prisma.assignment_detailsWhereInput = {};
    if (query.startDate || query.endDate) {
      where.assignments = {
        assignment_date: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        },
      };
    }
    if (query.status) where.status = query.status;

    const details = await this.repo.findAll(where);
    return details.map((d) => this.mapToResponse(d));
  }

  async findOne(id: string): Promise<TaskResponse> {
    const detail = await this.repo.findById(id);
    if (!detail) throw new NotFoundException(`Task ${id} not found`);
    return this.mapToResponse(detail);
  }

  async create(dto: CreateTaskDto): Promise<TaskResponse> {
    const shift = await this.repo.findOrCreateShift(dto.shift);
    const assignment = await this.repo.findOrCreateAssignment(
      new Date(dto.date),
    );

    const detail = await this.repo.create({
      task_description: dto.taskDescription,
      task_type: dto.taskType,
      status: dto.status ?? 'pending',
      notes: dto.notes ?? '',
      assignments: {
        connect: { id: assignment.id },
      },
      employees: {
        connect: { id: dto.employeeId },
      },
      pens: {
        connect: { id: dto.barnId },
      },
      work_shifts: {
        connect: { id: shift.id },
      },
    });
    return this.mapToResponse(detail);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskResponse> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Task ${id} not found`);

    const updateData: Prisma.assignment_detailsUpdateInput = {};
    if (dto.taskDescription !== undefined)
      updateData.task_description = dto.taskDescription;
    if (dto.taskType !== undefined) updateData.task_type = dto.taskType;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.employeeId !== undefined) {
      updateData.employees = { connect: { id: dto.employeeId } };
    }
    if (dto.barnId !== undefined) {
      updateData.pens = { connect: { id: dto.barnId } };
    }
    if (dto.shift) {
      const shift = await this.repo.findOrCreateShift(dto.shift);
      updateData.work_shifts = { connect: { id: shift.id } };
    }
    if (dto.date) {
      const assignment = await this.repo.findOrCreateAssignment(
        new Date(dto.date),
      );
      updateData.assignments = { connect: { id: assignment.id } };
    }

    const updated = await this.repo.update(id, updateData);
    return this.mapToResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Task ${id} not found`);
    await this.repo.delete(id);
  }

  async getEmployees() {
    return this.repo.findAllEmployees();
  }

  async getPens() {
    return this.repo.findAllPens();
  }
}
