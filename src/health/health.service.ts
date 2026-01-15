import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTreatmentDto,
  AddTreatmentLogDto,
  UpdatePigsStatusDto,
  PigStatus,
} from './dto/health.dto';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getActiveTreatments() {
    return this.prisma.disease_treatments.findMany({
      where: { status: 'TREATING' },
      include: {
        diseases: true,
        pens: { select: { pen_name: true } },
        pigs_in_treatment: {
          include: { pigs: true },
        },
        _count: {
          select: { pigs_in_treatment: { where: { status: 'SICK' } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getTreatmentHistory() {
    return this.prisma.disease_treatments.findMany({
      where: { status: 'FINISHED' },
      include: {
        diseases: true,
        pens: { select: { pen_name: true } },
        pigs_in_treatment: true,
        treatment_logs: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getTreatmentDetail(id: string) {
    const treatment = await this.prisma.disease_treatments.findUnique({
      where: { id },
      include: {
        diseases: true,
        pens: true,
        pigs_in_treatment: {
          include: { pigs: true },
        },
        treatment_logs: { orderBy: { date: 'asc' } },
      },
    });

    if (!treatment) throw new NotFoundException('Treatment record not found');
    return treatment;
  }

  async createTreatment(dto: CreateTreatmentDto) {
    return this.prisma.disease_treatments.create({
      data: {
        pen_id: dto.pen_id,
        disease_id: dto.disease_id,
        symptom: dto.symptom,
        status: 'TREATING',
        pigs_in_treatment: {
          create: dto.pig_ids.map((id) => ({
            pig_id: BigInt(id),
            status: 'SICK',
          })),
        },
      },
    });
  }

  async addLog(id: string, dto: AddTreatmentLogDto) {
    return this.prisma.treatment_logs.create({
      data: {
        treatment_id: id,
        date: new Date(dto.date),
        medicine: dto.medicine,
        dosage: dto.dosage,
        condition: dto.condition,
      },
    });
  }

  async reportDeath(dto: UpdatePigsStatusDto) {
    const ids = dto.pig_ids.map(BigInt);

    return this.prisma.$transaction(async (tx) => {
      await tx.pig_in_treatment.updateMany({
        where: { id: { in: ids } },
        data: { status: 'DEAD' },
      });

      await this.checkAndUpdateGroupStatus(dto.pig_ids[0], tx);
    });
  }

  async transferRecovered(dto: UpdatePigsStatusDto) {
    const ids = dto.pig_ids.map(BigInt);

    return this.prisma.$transaction(async (tx) => {
      await tx.pig_in_treatment.updateMany({
        where: { id: { in: ids } },
        data: { status: 'RECOVERED' },
      });

      await this.checkAndUpdateGroupStatus(dto.pig_ids[0], tx);
    });
  }

  private async checkAndUpdateGroupStatus(anyInTreatmentRecordId: string, tx: any) {
    const record = await tx.pig_in_treatment.findUnique({
      where: { id: BigInt(anyInTreatmentRecordId) },
      select: { treatment_id: true },
    });

    if (!record) return;

    const remainingSick = await tx.pig_in_treatment.count({
      where: {
        treatment_id: record.treatment_id,
        status: 'SICK',
      },
    });

    if (remainingSick === 0) {
      await tx.disease_treatments.update({
        where: { id: record.treatment_id },
        data: { status: 'FINISHED' },
      });
    }
  }
}
