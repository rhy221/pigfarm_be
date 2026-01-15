import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  // ==========================================================
  // 1. CALENDAR: Kết hợp Lịch đã lưu + Lịch dự kiến tự động
  // ==========================================================
  async getVaccinationCalendar(month: number, year: number) {
    const startDate = dayjs(`${year}-${month}-01`).startOf('month');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month');

    const templates = await this.prisma.vaccination_templates.findMany({
      include: { vaccines: true },
    });

    const activePens = await this.prisma.rearing_pens.findMany({
      include: {
        pens: true,
        pig_batchs: true, 
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
          });
        }
      });
    });

    for (const pen of activePens) {
      if (!pen.pig_batchs?.arrival_date) continue;

      const batchDate = dayjs(pen.pig_batchs.arrival_date);

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

  // ==========================================================
  // 2. DAILY DETAILS: Chi tiết ngày
  // ==========================================================
  async getDailyDetails(dateStr: string) {
    const targetDate = dayjs(dateStr);
    const dateObj = targetDate.toDate();

    const templates = await this.prisma.vaccination_templates.findMany({ include: { vaccines: true } });
    
    const activePens = await this.prisma.rearing_pens.findMany({
        include: { 
            pens: true, 
            pig_batchs: true 
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

        if (!pen.pig_batchs?.arrival_date) continue;
        const batchDate = dayjs(pen.pig_batchs.arrival_date);

        for (const tpl of templates) {
            const calculatedDate = batchDate.add(tpl.days_old, 'day');

            if (calculatedDate.isSame(targetDate, 'day')) {
                const key = `${tpl.vaccine_id}_${tpl.stage}`;
                const group = groupedResult.get(key);
                const alreadyScheduled = group?.pens.some(p => p.penName === pen.pens?.pen_name);

                if (!alreadyScheduled) {
                    const vName = tpl.vaccines?.vaccine_name || 'Unknown';

                    addToGroup(key, vName, tpl.stage || 1, {
                        scheduleId: null,
                        templateId: tpl.id,
                        penId: pen.pen_id,
                        penName: pen.pens?.pen_name,
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
  async markAsVaccinated(items: any[]) {
      const realIds = items.filter(i => i.isReal).map(i => i.scheduleId);
      const forecastItems = items.filter(i => !i.isReal);

      if (realIds.length) {
          await this.prisma.vaccination_schedules.updateMany({
              where: { id: { in: realIds } },
              data: { status: 'completed' }
          });
      }

      if (forecastItems.length) {
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
                               dosage: parseFloat(template.dosage || '0')
                           }
                       }
                   }
               });
          }
      }
      return { success: true };
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

  // 6. Gợi ý 
  async getVaccinationSuggestions() {
    const demoVaccine = await this.prisma.vaccines.findFirst();
    const vaccineId = demoVaccine?.id || 'demo-id';

    return [
      {
        code: 'FMD',
        name: 'Lở mồm long móng (FMD)',
        daysOld: 112,
        dosage: '2ml/con',
        description: 'Thương lái/kiểm dịch thường yêu cầu nếu xuất đi xa',
        color: 'green',
        vaccineId: vaccineId
      },
      {
        code: 'CSF',
        name: 'Dịch tả heo cổ điển',
        daysOld: 15,
        dosage: '1ml/con',
        description: 'Bệnh bắt buộc tiêm phòng',
        color: 'blue',
        vaccineId: vaccineId
      },
    ];
  }
}