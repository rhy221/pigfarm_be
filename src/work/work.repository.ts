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

  async findOrCreateAssignment(dateString: string) {
    // Parse date string YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create date at noon UTC to avoid any timezone conversion issues
    const targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    console.log('findOrCreateAssignment:', {
      dateString,
      targetDate: targetDate.toISOString(),
      targetDateLocal: targetDate.toString(),
    });

    // Search for existing assignment by checking if the date part matches
    const assignments = await this.prisma.assignments.findMany({
      where: {
        assignment_date: {
          gte: new Date(Date.UTC(year, month - 1, day, 0, 0, 0)),
          lt: new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0)),
        },
      },
    });

    let assignment = assignments[0];
    
    if (!assignment) {
      assignment = await this.prisma.assignments.create({
        data: { assignment_date: targetDate },
      });
      console.log('Created assignment:', {
        id: assignment.id,
        assignment_date: assignment.assignment_date,
        iso: assignment.assignment_date?.toISOString(),
      });
    } else {
      console.log('Found existing assignment:', {
        id: assignment.id,
        assignment_date: assignment.assignment_date,
        iso: assignment.assignment_date?.toISOString(),
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
    return this.prisma.users.findMany({
      select: {
        id: true,
        full_name: true,
        role_id: true,
        email: true,
        phone: true,
      },
      orderBy: { full_name: 'asc' },
    });
  }

  async syncUserToEmployee(
    userId: string,
    userName: string,
    userEmail: string,
  ) {
    // Check if employee already exists
    let employee = await this.prisma.employees.findUnique({
      where: { id: userId },
    });

    if (!employee) {
      // Create employee from user
      employee = await this.prisma.employees.create({
        data: {
          id: userId,
          name: userName,
          email: userEmail,
          role: 'employee',
        },
      });
    }

    return employee;
  }

  async findAllPens() {
    return this.prisma.pens.findMany({
      select: { id: true, pen_name: true, pen_type_id: true },
    });
  }
}
