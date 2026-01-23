import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';
import {
  CreateManualScheduleDto,
  UpdateScheduleDto,
  VaccinationActionItem,
} from './vaccination-schedule.dto'; 
import { CreateTemplateDto } from './vaccination-template.dto'; 

@Injectable()
export class VaccinationService {
  constructor(private prisma: PrismaService) {}
  
  // Helper
  private serialize(data: any) {
    return JSON.parse(
      JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  }

  // ==========================================================
  // 1. CALENDAR & SCHEDULES
  // ==========================================================
  async getVaccinationCalendar(month: number, year: number) {
    const startDate = dayjs(`${year}-${month}-01`).startOf('month');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month');
    
    // Convert sang Date object để so sánh nhanh hơn trong vòng lặp
    const startObj = startDate.toDate();
    const endObj = endDate.toDate();

    // 1. Chỉ select các trường cần thiết (Giảm tải Network DB)
    const templates = await this.prisma.vaccination_templates.findMany({
      include: { vaccines: { select: { vaccine_name: true } } }, // Chỉ lấy tên
    });

    const activePens = await this.prisma.pens.findMany({
      where: { current_quantity: { gt: 0 } },
      select: { // Select tối giản
        id: true,
        pigs: {
          take: 1,
          select: { 
            pig_batchs: {
              select: { 
                 arrival_date: true,
                 pig_batch_vaccines: { select: { vaccine_id: true } } // Chỉ lấy ID
              }
            } 
          },
        },
      },
    });

    const existingSchedules = await this.prisma.vaccination_schedules.findMany({
      where: {
        scheduled_date: {
          gte: startObj,
          lte: endObj,
        },
      },
      include: {
        vaccination_schedule_details: { include: { vaccines: { select: { vaccine_name: true } } } },
      },
    });

    const calendarMap: Record<string, any[]> = {};

    const pushToMap = (dateKey: string, item: any) => {
        if (!calendarMap[dateKey]) calendarMap[dateKey] = [];
        const exists = calendarMap[dateKey].some(i => i.name === item.name && i.id === item.id);
        if (!exists) calendarMap[dateKey].push(item);
    }

    for (const sched of existingSchedules) {
        if (!sched.scheduled_date) continue;
        const dateKey = dayjs(sched.scheduled_date).format('YYYY-MM-DD'); 

        for (const detail of sched.vaccination_schedule_details) {
            pushToMap(dateKey, {
                id: sched.id,
                name: detail.vaccines?.vaccine_name || 'Unknown',
                status: sched.status,
                type: 'actual',
                color: sched.color || (sched.status === 'completed' ? '#10B981' : '#3B82F6')
            });
        }
    }

    for (const pen of activePens) {
       const batch = pen.pigs?.[0]?.pig_batchs;
       if (!batch?.arrival_date) continue;
       
       const batchDate = dayjs(batch.arrival_date);
       const injectedVaccineIds = new Set(
           (batch as any).pig_batch_vaccines?.map((v: any) => v.vaccine_id) || []
       );

       for (const tpl of templates) {
         if (injectedVaccineIds.has(tpl.vaccine_id)) continue; 

         const targetDate = batchDate.add(tpl.days_old, 'day');
         
         if (targetDate.isAfter(endDate) || targetDate.isBefore(startDate)) {
             continue; 
         }

         const dateKey = targetDate.format('YYYY-MM-DD');
         const vaccineName = tpl.vaccines?.vaccine_name || 'Unknown';
         
         if (!calendarMap[dateKey]) calendarMap[dateKey] = [];
         
         const hasRealSchedule = calendarMap[dateKey].some(
             item => item.name === vaccineName && item.type === 'actual'
         );
         
         if (!hasRealSchedule) {
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
    return calendarMap;
  }

async getDailyDetails(dateStr: string) {
    const queryDate = dayjs(dateStr);
    const isToday = queryDate.isSame(dayjs(), 'day'); 
    const startOfDay = dayjs(dateStr).startOf('day').toDate();
    const endOfDay = dayjs(dateStr).endOf('day').toDate();

    const templates = await this.prisma.vaccination_templates.findMany({
      include: { vaccines: true }
    });
    
    const activePens = await this.prisma.pens.findMany({
        where: { current_quantity: { gt: 0 } },
        include: { 
            pigs: { 
                select: { 
                    pig_batchs: {
                        select: { arrival_date: true }
                    } 
                }, 
                take: 1 
            } 
        } 
    });

    // 1. Lấy lịch của ngày hiện tại (để hiển thị chi tiết hôm nay)
    const existingSchedules = await this.prisma.vaccination_schedules.findMany({
      where: { 
        scheduled_date: { 
            gte: startOfDay, 
            lte: endOfDay    
        } 
      },
      include: {
        pens: true,
        vaccination_schedule_details: { include: { vaccines: true } },
      },
    });

    const groupedResult = new Map<string, any>();
    const bookedMap = new Set<string>();

    // =========================================================================
    // [FIX MỚI] 2. Lấy toàn bộ lịch sử đã tiêm của các chuồng này (Bất kể ngày nào)
    // Để đảm bảo nếu đã tiêm hôm qua, hôm nay không hiện nhắc nhở nữa
    // =========================================================================
    const historySchedules = await this.prisma.vaccination_schedules.findMany({
        where: {
            pen_id: { in: activePens.map(p => p.id) }, // Chỉ check các chuồng đang có heo
            status: 'completed' // Chỉ quan tâm các mũi ĐÃ TIÊM
        },
        select: {
            pen_id: true,
            vaccination_schedule_details: {
                select: { vaccine_id: true, stage: true }
            }
        }
    });

    // Nạp lịch sử vào bookedMap để chặn hiển thị dự kiến
    historySchedules.forEach(sched => {
        sched.vaccination_schedule_details.forEach(detail => {
            bookedMap.add(`${sched.pen_id}-${detail.vaccine_id}-${detail.stage}`);
        });
    });

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
        if (!group.pens.some((p: any) => p.penName === penInfo.penName)) {
            group.totalPens += 1;
            group.pens.push(penInfo);
        }
    };

    // Logic A: Hiển thị các lịch CÓ trong ngày hôm nay (Query Date)
    existingSchedules.forEach((schedule) => {
        const sched = schedule as any; 
        sched.vaccination_schedule_details.forEach((detail: any) => {
            if (!detail.vaccines) return;
            
            // Cũng add vào bookedMap (dù thừa nhưng an toàn cho trường hợp pending trong ngày)
            bookedMap.add(`${sched.pen_id}-${detail.vaccines.id}-${detail.stage}`);

            const key = `${detail.vaccines.id}_${detail.stage}_${sched.status}`; 
            
            addToGroup(key, detail.vaccines.vaccine_name || 'Unknown', detail.stage || 1, {
                scheduleId: sched.id,
                penName: sched.pens?.pen_name,
                status: sched.status,
                isReal: true
            });
        });
    });

    // Logic B: Tính toán dự kiến (Dựa trên Template)
    for (const pen of activePens) {
      const batch = pen.pigs?.[0]?.pig_batchs;
      if (!batch?.arrival_date) continue;

      const batchDate = dayjs(batch.arrival_date);

      for (const tpl of templates) {
          // Kiểm tra xem chuồng này đã tiêm mũi này chưa (Check trong toàn bộ lịch sử)
          if (bookedMap.has(`${pen.id}-${tpl.vaccine_id}-${tpl.stage}`)) {
              continue; // Nếu đã tiêm rồi thì BỎ QUA, không hiện dự kiến nữa
          }

          const calculatedDate = batchDate.add(tpl.days_old, 'day');
          const isExactDate = calculatedDate.isSame(queryDate, 'day');
          const isOverdue = isToday && 
                            calculatedDate.isBefore(queryDate, 'day') && 
                            calculatedDate.isAfter(queryDate.subtract(60, 'day'));

          if (isExactDate || isOverdue) {
              const key = `${tpl.vaccine_id}_${tpl.stage}_forecast`;

              addToGroup(key, tpl.vaccines?.vaccine_name || 'Unknown', tpl.stage || 1, {
                  scheduleId: null,
                  templateId: tpl.id,
                  penId: pen.id,
                  penName: pen.pen_name,
                  status: 'forecast',
                  isReal: false,
                  isOverdue: isOverdue, 
                  originalDate: calculatedDate.format('DD/MM') 
              });
          }
      }
  }
    return Array.from(groupedResult.values());
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
    if (!targetVaccineId) throw new Error('Vui lòng chọn hoặc nhập tên vắc-xin');

    const tasks = data.penIds.map(penId => {
      return this.prisma.vaccination_schedules.create({
        data: {
          pen_id: penId,
          scheduled_date: dayjs(data.scheduledDate).startOf('day').toDate(),
          status: 'pending',
          color: data.color || '#3B82F6',
          employee_id: null,
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
      // ... Copy logic updateSchedule cũ ...
    let newVaccineId = data.vaccineId;
    if (!newVaccineId && data.vaccineName) {
      const existing = await this.prisma.vaccines.findFirst({
        where: { vaccine_name: { equals: data.vaccineName, mode: 'insensitive' } }
      });
      if (existing) newVaccineId = existing.id;
      else {
        const newVac = await this.prisma.vaccines.create({ data: { vaccine_name: data.vaccineName } });
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
      await tx.vaccination_schedule_details.deleteMany({ where: { schedule_id: id } });
      await tx.vaccination_schedules.delete({ where: { id } });
    });
  }

  async markAsVaccinated(items: VaccinationActionItem[]) {
    const realItems = items.filter(i => i.isReal && i.scheduleId);
    const forecastItems = items.filter(i => !i.isReal && i.templateId && i.penId);

    if (realItems.length > 0) {
      const idsToUpdate = realItems.map(i => i.scheduleId as string);
      await this.prisma.vaccination_schedules.updateMany({
        where: { id: { in: idsToUpdate } },
        data: { 
            status: 'completed',
            scheduled_date: new Date() 
        }
      });
    }

    if (forecastItems.length > 0) {
      for (const item of forecastItems) {
        const template = await this.prisma.vaccination_templates.findUnique({
          where: { id: item.templateId }
        });
        if (!template) continue; 
        
        const penWithBatch = await this.prisma.pens.findUnique({
            where: { id: item.penId },
            include: {
                pigs: {
                    take: 1, 
                    select: { pig_batchs: true }
                }
            }
        });
        const batchId = penWithBatch?.pigs?.[0]?.pig_batchs?.id;
        const existingSchedule = await this.prisma.vaccination_schedules.findFirst({
            where: {
                pen_id: item.penId,
                vaccination_schedule_details: {
                    some: { vaccine_id: template.vaccine_id, stage: template.stage }
                }
            }
        });
        if (existingSchedule) {
            await this.prisma.vaccination_schedules.update({
                where: { id: existingSchedule.id },
                data: { status: 'completed', scheduled_date: new Date() }
            });
        } else {
            await this.prisma.vaccination_schedules.create({
                data: {
                    pen_id: item.penId,
                    scheduled_date: new Date(), 
                    status: 'completed',
                    employee_id: null, 
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
        if (batchId) {
            const exists = await this.prisma.pig_batch_vaccines.findFirst({
                where: {
                    pig_batch_id: batchId,
                    vaccine_id: template.vaccine_id
                }
            });

            if (!exists) {
                await this.prisma.pig_batch_vaccines.create({
                    data: {
                        pig_batch_id: batchId,
                        vaccine_id: template.vaccine_id
                    }
                });
            }
        }
      }
    }
    return { success: true, updated: realItems.length, created: forecastItems.length };
  }

  async getAllVaccines() {
      // Logic này để lấy danh sách dropdown cho lúc tạo lịch
      const vaccines = await this.prisma.vaccines.findMany({ orderBy: { vaccine_name: 'asc' } });
      return vaccines.map(v => ({ id: v.id, name: v.vaccine_name || '', description: v.description }));
  }

  // ==========================================================
  // 2. TEMPLATES (MẪU TIÊM)
  // ==========================================================
  async getVaccinationTemplates() {
    const templates = await this.prisma.vaccination_templates.findMany({
      include: { vaccines: true },
      orderBy: { days_old: 'asc' },
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

  async addTemplate(data: CreateTemplateDto) {
    // ... Copy logic addTemplate cũ ...
    let targetVaccineId = data.vaccineId;
    if (!targetVaccineId) {
        const existingVaccine = await this.prisma.vaccines.findFirst({
        where: { vaccine_name: { equals: data.vaccineName, mode: 'insensitive' } }
        });
        if (existingVaccine) targetVaccineId = existingVaccine.id;
        else {
        const newVaccine = await this.prisma.vaccines.create({ data: { vaccine_name: data.vaccineName } });
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
        include: { vaccines: true },
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
    const exists = await this.prisma.vaccination_templates.findUnique({ where: { id } });
    if (!exists) throw new Error('Mẫu tiêm không tồn tại');
    return this.prisma.vaccination_templates.delete({ where: { id } });
  }

  async getVaccinationSuggestions() {
      // ... Copy logic getVaccinationSuggestions cũ ...
    const currentTemplates = await this.prisma.vaccination_templates.findMany();
    const standardLibrary = await this.prisma.vaccines.findMany({ where: { days_old: { gt: 0 } } });
    const suggestions: any[] = []; 

    for (const stdItem of standardLibrary) {
        const isExist = currentTemplates.some(t => t.vaccine_id === stdItem.id && t.stage === stdItem.stage);
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

  async getActivePens() {
    const pens = await this.prisma.pens.findMany({
      where: { 
        current_quantity: { gt: 0 } 
      },
      orderBy: { 
        pen_name: 'asc' 
      },
      select: {
        id: true,
        pen_name: true,
        current_quantity: true
      }
    });

    return pens.map(p => ({
      id: p.id,
      name: p.pen_name,
      quantity: p.current_quantity
    }));
  }

  // ==========================================================
  // REPLACE THE OLD revertVaccination FUNCTION WITH THIS ONE
  // ==========================================================
  async revertVaccination(scheduleId: string) {
    // 1. Lấy thông tin lịch tiêm trước khi xóa để biết Vaccine nào và Lô heo nào
    const schedule = await this.prisma.vaccination_schedules.findUnique({
      where: { id: scheduleId },
      include: {
        vaccination_schedule_details: true,
        pens: {
          include: {
            pigs: { take: 1, select: { pig_batchs: true } },
          },
        },
      },
    });

    if (!schedule) {
      throw new Error('Lịch tiêm không tồn tại hoặc đã bị xóa.');
    }

    const vaccineId = schedule.vaccination_schedule_details?.[0]?.vaccine_id;
    const batchId = schedule.pens?.pigs?.[0]?.pig_batchs?.id;

    return this.prisma.$transaction(async (tx) => {
      await tx.vaccination_schedule_details.deleteMany({
        where: { schedule_id: scheduleId },
      });

      await tx.vaccination_schedules.delete({
        where: { id: scheduleId },
      });

      if (vaccineId && batchId) {
        const remainingSchedules = await tx.vaccination_schedules.count({
          where: {
            id: { not: scheduleId }, 
            status: 'completed',
            pens: {
              pigs: {
                some: {
                  pig_batchs: { id: batchId }
                }
              }
            },
            vaccination_schedule_details: {
              some: { vaccine_id: vaccineId }
            }
          },
        });

        if (remainingSchedules === 0) {
          await tx.pig_batch_vaccines.deleteMany({
            where: {
              pig_batch_id: batchId,
              vaccine_id: vaccineId,
            },
          });
        }
      }
    });
  }
}