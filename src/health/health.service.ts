import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './template.dto'; 
import dayjs from 'dayjs';
import { 
  CreateManualScheduleDto, 
  MarkVaccinatedDto, 
  UpdateScheduleDto, 
  VaccinationActionItem,
} from './health.dto';
import { CreateTreatmentDto, AddTreatmentLogDto, UpdatePigsStatusDto, } from './dto/health.dto';


@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  private serialize(data: any) {
    return JSON.parse(
      JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  }

  async getActiveTreatments() {
    const data = await this.prisma.disease_treatments.findMany({
      where: { status: 'TREATING' },
      include: {
        diseases: { select: { name: true } },
        pens: { select: { pen_name: true } },
        pigs_in_treatment: {
          where: { status: 'SICK' },
          select: { id: true } 
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const processed = data.map(item => ({
      ...item,
      _count: {
        pigs_in_treatment: item.pigs_in_treatment.length
      }
    }));

    return this.serialize(processed);
  }

  async getTreatmentHistory() {
    const data = await this.prisma.disease_treatments.findMany({
      where: { status: 'FINISHED' },
      include: {
        diseases: { select: { name: true } },
        pens: { select: { pen_name: true } },
        pigs_in_treatment: true,
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

  
  // ==========================================================
  // 1. CALENDAR: Kết hợp Lịch đã lưu + Lịch dự kiến tự động
  // ==========================================================
  async getVaccinationCalendar(month: number, year: number) {
    const startDate = dayjs(`${year}-${month}-01`).startOf('month');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month');

    const templates = await this.prisma.vaccination_templates.findMany({
      include: { vaccines: true },
    });

    // UPDATED: Query pens directly instead of rearing_pens
    const activePens = await this.prisma.pens.findMany({
      where: { current_quantity: { gt: 0 } },
      include: {
        pigs: {
          select: { pig_batchs: true },
          take: 1, // Assume all pigs in one pen belong to the same batch
        },
      },
    });

    const existingSchedules = await this.prisma.vaccination_schedules.findMany({
      where: {
        scheduled_date: {
          gte: startDate.toDate(),
          lte: endDate.toDate(),
        },
      },
      include: {
        vaccination_schedule_details: { include: { vaccines: true } },
      },
    });

    const calendarMap: Record<string, any[]> = {};

    existingSchedules.forEach((schedule) => {
      const sched = schedule as any; 

      if (!sched.scheduled_date) return;
      const dateKey = dayjs(sched.scheduled_date).format('YYYY-MM-DD');
      
      if (!calendarMap[dateKey]) calendarMap[dateKey] = [];

      sched.vaccination_schedule_details.forEach((detail: any) => {
        const vaccineName = detail.vaccines?.vaccine_name || 'Unknown';
        
        if (!calendarMap[dateKey].some((i) => i.name === vaccineName && i.scheduleId === sched.id)) {
            calendarMap[dateKey].push({
            id: sched.id,
            name: vaccineName,
            status: sched.status,
            type: 'actual',
            color: sched.color || (sched.status === 'completed' ? '#10B981' : '#3B82F6') 
          });
        }
      });
    });

    for (const pen of activePens) {
      // UPDATED: Get batch info from the pigs relation
      const batch = pen.pigs?.[0]?.pig_batchs;
      if (!batch?.arrival_date) continue;

      const batchDate = dayjs(batch.arrival_date);

      for (const tpl of templates) {
        const targetDate = batchDate.add(tpl.days_old, 'day');

        if (targetDate.isAfter(startDate) && targetDate.isBefore(endDate)) {
          const dateKey = targetDate.format('YYYY-MM-DD');
          if (!calendarMap[dateKey]) calendarMap[dateKey] = [];

          const vaccineName = tpl.vaccines?.vaccine_name || 'Unknown';
          
          const alreadyExists = calendarMap[dateKey].some(
             item => item.name === vaccineName && item.type === 'actual'
          );

          if (!alreadyExists) {
             const isVisualExist = calendarMap[dateKey].some(i => i.name === vaccineName && i.type === 'forecast');
             if (!isVisualExist) {
                calendarMap[dateKey].push({
                    id: `virtual-${tpl.id}-${dateKey}`,
                    name: vaccineName,
                    status: 'forecast',
                    type: 'forecast',
                    color: 'orange'
                });
             }
          }
        }
      }
    }

    return calendarMap;
  }

  async createManualSchedule(data: CreateManualScheduleDto) {
    let targetVaccineId = data.vaccineId;

    if (!targetVaccineId && data.vaccineName) {
      const existing = await this.prisma.vaccines.findFirst({
        where: { vaccine_name: { equals: data.vaccineName, mode: 'insensitive' } }
      });

      if (existing) {
        targetVaccineId = existing.id;
      } else {
        const newVac = await this.prisma.vaccines.create({
          data: { vaccine_name: data.vaccineName }
        });
        targetVaccineId = newVac.id;
      }
    }

    if (!targetVaccineId) {
      throw new Error('Vui lòng chọn hoặc nhập tên vắc-xin');
    }

    const tasks = data.penIds.map(penId => {
      return this.prisma.vaccination_schedules.create({
        data: {
          pen_id: penId,
          scheduled_date: new Date(data.scheduledDate),
          status: 'pending',
          
          color: data.color || '#3B82F6',
          
          vaccination_schedule_details: {
            create: {
              vaccine_id: targetVaccineId,
              stage: data.stage,
              dosage: 0
            }
          }
        }
      });
    });

    await Promise.all(tasks);
    return { success: true, count: data.penIds.length };
  }

  async updateSchedule(id: string, data: UpdateScheduleDto) {
    let newVaccineId = data.vaccineId;

    if (!newVaccineId && data.vaccineName) {
      const existing = await this.prisma.vaccines.findFirst({
        where: { vaccine_name: { equals: data.vaccineName, mode: 'insensitive' } }
      });

      if (existing) {
        newVaccineId = existing.id;
      } else {
        const newVac = await this.prisma.vaccines.create({
          data: { vaccine_name: data.vaccineName }
        });
        newVaccineId = newVac.id;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedSchedule = await tx.vaccination_schedules.update({
        where: { id },
        data: {
          scheduled_date: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
          color: data.color, 
        },
      });

      if (newVaccineId || data.stage) {
        await tx.vaccination_schedule_details.updateMany({
          where: { schedule_id: id },
          data: {
            vaccine_id: newVaccineId || undefined, 
            stage: data.stage || undefined,
          }
        });
      }

      return updatedSchedule;
    });
  }

  async deleteSchedule(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.vaccination_schedule_details.deleteMany({
        where: { schedule_id: id }
      });
      await tx.vaccination_schedules.delete({
        where: { id }
      });
    });
  }

  // ==========================================================
  // 2. DAILY DETAILS: Chi tiết ngày
  // ==========================================================
  async getDailyDetails(dateStr: string) {
    const targetDate = dayjs(dateStr);
    const dateObj = targetDate.toDate();

    const templates = await this.prisma.vaccination_templates.findMany({ include: { vaccines: true } });
    
    // UPDATED: Query pens directly
    const activePens = await this.prisma.pens.findMany({
        where: { current_quantity: { gt: 0 } },
        include: { 
            pigs: {
              select: { pig_batchs: true },
              take: 1
            } 
        } 
    });

    const existingSchedules = await this.prisma.vaccination_schedules.findMany({
      where: { scheduled_date: { equals: dateObj } },
      include: {
        pens: true,
        vaccination_schedule_details: { include: { vaccines: true } },
      },
    });

    const groupedResult = new Map<string, any>();

    const addToGroup = (key: string, vaccineName: string, stage: number, penInfo: any) => {
        if (!groupedResult.has(key)) {
            groupedResult.set(key, {
                vaccineName: vaccineName,
                stage: stage,
                totalPens: 0,
                pens: []
            });
        }
        const group = groupedResult.get(key);
        if (!group.pens.some(p => p.penName === penInfo.penName)) {
            group.totalPens += 1;
            group.pens.push(penInfo);
        }
    };

    // Bước A: Lịch thật
    existingSchedules.forEach((schedule) => {
        const sched = schedule as any; 

        sched.vaccination_schedule_details.forEach((detail: any) => {
            if (!detail.vaccines) return;
            const key = `${detail.vaccines.id}_${detail.stage}`;
            
            const vName = detail.vaccines.vaccine_name || 'Unknown';

            addToGroup(key, vName, detail.stage || 1, {
                scheduleId: sched.id,
                penName: sched.pens?.pen_name,
                status: sched.status,
                isReal: true
            });
        });
    });

    // Bước B: Lịch dự kiến
    for (const pen of activePens) {
        // UPDATED: Get batch info from pigs
        const batch = pen.pigs?.[0]?.pig_batchs;
        if (!batch?.arrival_date) continue;
        const batchDate = dayjs(batch.arrival_date);

        for (const tpl of templates) {
            const calculatedDate = batchDate.add(tpl.days_old, 'day');

            if (calculatedDate.isSame(targetDate, 'day')) {
                const key = `${tpl.vaccine_id}_${tpl.stage}`;
                const group = groupedResult.get(key);
                const alreadyScheduled = group?.pens.some(p => p.penName === pen.pen_name);

                if (!alreadyScheduled) {
                    const vName = tpl.vaccines?.vaccine_name || 'Unknown';

                    addToGroup(key, vName, tpl.stage || 1, {
                        scheduleId: null,
                        templateId: tpl.id,
                        penId: pen.id, // UPDATED: pen.id directly
                        penName: pen.pen_name, // UPDATED: pen.pen_name directly
                        status: 'forecast',
                        isReal: false
                    });
                }
            }
        }
    }

    return Array.from(groupedResult.values());
  }

  // 3. Mark As Vaccinated
  async markAsVaccinated(items: VaccinationActionItem[]) {
    const realItems = items.filter(i => i.isReal && i.scheduleId);
    const forecastItems = items.filter(i => !i.isReal && i.templateId && i.penId);

    if (realItems.length > 0) {
      const idsToUpdate = realItems.map(i => i.scheduleId as string);
      await this.prisma.vaccination_schedules.updateMany({
        where: { id: { in: idsToUpdate } },
        data: { status: 'completed' }
      });
    }

    if (forecastItems.length > 0) {
      for (const item of forecastItems) {
        const template = await this.prisma.vaccination_templates.findUnique({
          where: { id: item.templateId }
        });

        if (!template) continue; 

        await this.prisma.vaccination_schedules.create({
          data: {
            pen_id: item.penId,
            scheduled_date: new Date(), 
            status: 'completed',
            vaccination_schedule_details: {
              create: {
                vaccine_id: template.vaccine_id,
                stage: template.stage,
                dosage: parseFloat(template.dosage?.replace(/[^0-9.]/g, '') || '0') 
              }
            }
          }
        });
      }
    }

    return { 
      success: true, 
      updated: realItems.length, 
      created: forecastItems.length 
    };
  }

  async getVaccinationTemplates() {
    const templates = await this.prisma.vaccination_templates.findMany({
      include: {
        vaccines: true,
      },
      orderBy: {
        days_old: 'asc',
      },
    });

    return templates.map((t, index) => ({
      id: t.id,
      stt: index + 1,
      vaccineId: t.vaccine_id,
      vaccineName: t.vaccines?.vaccine_name || 'Unknown',
      stage: t.stage,
      fullName: `${t.vaccines?.vaccine_name || 'Unknown'} - Mũi ${t.stage}`,
      dosage: t.dosage,
      daysOld: t.days_old,
      daysOldText: `${t.days_old} ngày tuổi`,
      notes: t.notes,
    }));
  }

  // 5. Lưu danh sách Templates
  async saveVaccinationTemplates(data: any[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.vaccination_templates.deleteMany({});

      if (data.length > 0) {
        await tx.vaccination_templates.createMany({
          data: data.map((item) => ({
            vaccine_id: item.vaccineId,
            stage: item.stage,
            days_old: item.daysOld,
            dosage: item.dosage,
            notes: item.notes,
          })),
        });
      }
    });
    return this.getVaccinationTemplates();
  }

async getVaccinationSuggestions() {
  const currentTemplates = await this.prisma.vaccination_templates.findMany();
  
  const standardLibrary = await this.prisma.vaccines.findMany({
    where: { 
      days_old: { gt: 0 } 
    } 
  });

  // [FIX 1] Thêm kiểu : any[] hoặc VaccinationSuggestionDto[]
  const suggestions: any[] = []; 

  for (const stdItem of standardLibrary) {
    const isExist = currentTemplates.some(t => 
      t.vaccine_id === stdItem.id && t.stage === stdItem.stage
    );

    if (!isExist) {
      suggestions.push({
        vaccineId: stdItem.id,
        vaccineName: stdItem.vaccine_name || '', 
        nameDisplay: stdItem.vaccine_name || '', 
        stage: stdItem.stage || 1,
        daysOld: stdItem.days_old || 0,
        dosage: stdItem.dosage || '',
        description: stdItem.description || '', 
        color: this.getPriorityColor(stdItem.days_old || 999),
        type: 'gap_analysis'
      });
    }
  }

  return suggestions;
}
  private getPriorityColor(days: number): string {
    if (days <= 21) return 'red';   
    if (days <= 45) return 'orange'; 
    return 'blue';                   
  }

  async addTemplate(data: CreateTemplateDto) {
  let targetVaccineId = data.vaccineId;

  if (!targetVaccineId) {
    const existingVaccine = await this.prisma.vaccines.findFirst({
      where: { 
        vaccine_name: { 
          equals: data.vaccineName, 
          mode: 'insensitive' 
        } 
      }
    });

    if (existingVaccine) {
      targetVaccineId = existingVaccine.id;
    } else {
      const newVaccine = await this.prisma.vaccines.create({
        data: {
          vaccine_name: data.vaccineName
        }
      });
      targetVaccineId = newVaccine.id;
    }
  }

  const newTemplate = await this.prisma.vaccination_templates.create({
    data: {
      vaccine_id: targetVaccineId, 
      stage: data.stage,
      days_old: data.daysOld,
      dosage: data.dosage,
      notes: data.notes,
    },
    include: {
      vaccines: true,
    },
  });

  return {
    id: newTemplate.id,
    vaccineId: newTemplate.vaccine_id,
    vaccineName: newTemplate.vaccines?.vaccine_name || data.vaccineName,
    stage: newTemplate.stage,
    fullName: `${newTemplate.vaccines?.vaccine_name} - Mũi ${newTemplate.stage}`,
    dosage: newTemplate.dosage,
    daysOld: newTemplate.days_old,
    daysOldText: `${newTemplate.days_old} ngày tuổi`,
    notes: newTemplate.notes,
  };
}

  async deleteTemplate(id: string) {
    const exists = await this.prisma.vaccination_templates.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new Error('Mẫu tiêm không tồn tại');
    }

    return this.prisma.vaccination_templates.delete({
      where: { id },
    });
  }
}