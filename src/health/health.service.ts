// health/health.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTreatmentDto,
  AddTreatmentLogDto,
  UpdatePigsStatusDto,
} from './dto/health.dto';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  private serialize(data: any) {
    return JSON.parse(
      JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  }

  // --- PHẦN ĐIỀU TRỊ BỆNH (GIỮ LẠI) ---

  async getActiveTreatments() {
    const data = await this.prisma.disease_treatments.findMany({
      where: { status: 'TREATING' },
      include: {
        diseases: { select: { name: true } },
        pens: { select: { pen_name: true } },
        pigs_in_treatment: {
          where: { status: 'SICK' },
          select: { id: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const processed = data.map((item) => ({
      ...item,
      _count: {
        pigs_in_treatment: item.pigs_in_treatment.length,
      },
    }));

    return this.serialize(processed);
  }

  async getTreatmentHistory() {
    const data = await this.prisma.disease_treatments.findMany({
      where: { status: 'FINISHED' },
      include: {
        diseases: { select: { name: true } },
        pens: { select: { pen_name: true } },
        pigs_in_treatment: {
          include: {
            pigs: {
              select: {
                id: true,
                ear_tag_number: true,
              }
            }
          }
        },
        treatment_logs: { orderBy: { date: 'desc' } },
      },
      orderBy: { end_date: 'desc' },
    });
    return this.serialize(data);
  }

  async getTreatmentDetail(id: string) {
    const treatment = await this.prisma.disease_treatments.findUnique({
      where: { id },
      include: {
        diseases: { select: { name: true } },
        pens: { select: { pen_name: true } },
        pigs_in_treatment: {
          include: { pigs: true },
        },
        treatment_logs: { orderBy: { date: 'asc' } },
      },
    });

    if (!treatment) throw new NotFoundException('Không tìm thấy ca điều trị');
    return this.serialize(treatment);
  }

  async createTreatment(dto: CreateTreatmentDto) {
    const data = await this.prisma.disease_treatments.create({
      data: {
        pen_id: dto.pen_id,
        disease_id: dto.disease_id,
        symptom: dto.symptom,
        status: 'TREATING',
        pigs_in_treatment: {
          create: dto.pig_ids.map((id) => ({
            pig_id: id,
            status: 'SICK',
          })),
        },
      },
    });
    return this.serialize(data);
  }

  async addLog(id: string, dto: AddTreatmentLogDto) {
    const data = await this.prisma.treatment_logs.create({
      data: {
        treatment_id: id,
        date: new Date(dto.date),
        medicine: dto.medicine,
        dosage: dto.dosage,
        condition: dto.condition,
      },
    });
    return this.serialize(data);
  }

  async reportDeath(dto: UpdatePigsStatusDto) {
    const ids = dto.pig_ids.map((id) => BigInt(id));
    return this.prisma.$transaction(async (tx) => {
      const deadStatus = await tx.pig_statuses.findFirst({
        where: { status_name: { contains: 'Chết' } },
      });

      const inTreatmentRecords = await tx.pig_in_treatment.findMany({
        where: { id: { in: ids } },
        select: { pig_id: true, treatment_id: true },
      });

      await tx.pig_in_treatment.updateMany({
        where: { id: { in: ids } },
        data: { status: 'DEAD' },
      });

      const pigIds = inTreatmentRecords
        .map((r) => r.pig_id)
        .filter((id): id is string => id !== null);

      await tx.pigs.updateMany({
        where: { id: { in: pigIds } },
        data: { pig_status_id: deadStatus?.id },
      });

      if (inTreatmentRecords.length > 0) {
        await this.checkAndUpdateGroupStatus(inTreatmentRecords[0].treatment_id, tx);
      }
    });
  }

  async transferRecovered(dto: UpdatePigsStatusDto) {
    const treatmentRecordIds = dto.pig_ids.map((id) => BigInt(id));

    return this.prisma.$transaction(async (tx) => {
      const healthyStatus = await tx.pig_statuses.findFirst({
        where: { status_name: { contains: 'Khoẻ' } },
      });

      const records = await tx.pig_in_treatment.findMany({
        where: { id: { in: treatmentRecordIds } },
        select: { pig_id: true, treatment_id: true },
      });

      await tx.pig_in_treatment.updateMany({
        where: { id: { in: treatmentRecordIds } },
        data: { status: 'RECOVERED' },
      });

      const actualPigIds = records.map((r) => r.pig_id).filter(Boolean);

      await tx.pigs.updateMany({
        where: { id: { in: actualPigIds as string[] } },
        data: {
          pig_status_id: healthyStatus?.id,
          pen_id: dto.target_pen_id,
        },
      });

      if (records.length > 0) {
        await this.checkAndUpdateGroupStatus(records[0].treatment_id, tx);
      }
    });
  }

  async updateTreatment(id: string, data: { symptom?: string }) {
    const updated = await this.prisma.disease_treatments.update({
      where: { id },
      data: {
        symptom: data.symptom,
      },
    });
    return this.serialize(updated);
  }

  async updateLog(logId: string, data: any) {
    return this.prisma.treatment_logs.update({
      where: { id: BigInt(logId) },
      data: {
        medicine: data.medicine,
        dosage: data.dosage,
        condition: data.condition,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  private async checkAndUpdateGroupStatus(treatmentId: string | null, tx: any) {
    if (!treatmentId) return;
    const remainingSick = await tx.pig_in_treatment.count({
      where: { treatment_id: treatmentId, status: 'SICK' },
    });

    if (remainingSick === 0) {
      await tx.disease_treatments.update({
        where: { id: treatmentId },
        data: { status: 'FINISHED', end_date: new Date() },
      });
    }
  }
    
  async getAllPens() {
    const pens = await this.prisma.pens.findMany({
      include: { pen_types: true } 
    });
    return this.serialize(pens);
  }

  async getAllPenTypes() {
    const types = await this.prisma.pen_types.findMany();
    return this.serialize(types);
  }
}
