import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class WorkRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    assignments: true,
    employees: true,
    pens: true,
    work_shifts: true,
  } as const satisfies Prisma.assignment_detailsInclude;

  async findAll(where: Prisma.assignment_detailsWhereInput) {
    return this.prisma.assignment_details.findMany({
      where,
      include: this.includeRelations,
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.assignment_details.findUnique({
      where: { id },
      include: this.includeRelations,
    });
  }

  async create(data: Prisma.assignment_detailsCreateInput) {
    return this.prisma.assignment_details.create({
      data,
      include: this.includeRelations,
    });
  }

  async update(id: string, data: Prisma.assignment_detailsUpdateInput) {
    return this.prisma.assignment_details.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
      include: this.includeRelations,
    });
  }

  async delete(id: string) {
    await this.prisma.assignment_details.delete({ where: { id } });
  }

  async findOrCreateAssignment(date: Date) {
    let assignment = await this.prisma.assignments.findFirst({
      where: { assignment_date: date },
    });
    if (!assignment) {
      assignment = await this.prisma.assignments.create({
        data: { assignment_date: date },
      });
    }
    return assignment;
  }

  async findOrCreateShift(session: string) {
    let shift = await this.prisma.work_shifts.findFirst({
      where: { session },
    });
    if (!shift) {
      shift = await this.prisma.work_shifts.create({
        data: { session, start_time: new Date(), end_time: new Date() },
      });
    }
    return shift;
  }

  async findAllEmployees() {
    return this.prisma.employees.findMany({
      select: { id: true, name: true, role: true, email: true },
    });
  }

  async findAllPens() {
    return this.prisma.pens.findMany({
      select: { id: true, pen_name: true, pen_type_id: true },
    });
  }
}
