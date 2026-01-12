import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkRepository } from './work.repository';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto } from './dto';
import { Prisma } from '@prisma/client';

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
