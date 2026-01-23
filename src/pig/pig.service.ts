import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PigDashboardStatsDto, PenItemDto, ImportPigBatchDto, UpdatePigListDto, TransferPigDto } from './pig.dto';
import dayjs from 'dayjs';

@Injectable()
export class PigService {
  constructor(private prisma: PrismaService) {}

  async findByPen(penId: string) {
    return (this.prisma as any).pigs.findMany({
      where: { 
        pen_id: penId,
        pig_statuses: {
          // status_name: {
          //   contains: 'Khoẻ',
          //   mode: 'insensitive'
          // }
        }
      },
      include: { 
        pig_breeds: true,
        pig_statuses: true 
      },
    });
  }

  async findByBreed(breedId: string) {
    return (this.prisma as any).pigs.findMany({
      where: {
        pig_batch_id: breedId,
      },
      include: {
        pens: true,
        pig_statuses: true,
      },
    });
  }

  async getArrivalDateByPen(penId: string) {
    const penInfo = await (this.prisma as any).pens.findUnique({
      where: { id: penId },
      select: {
        pigs: {
          take: 1,
          select: {
            pig_batchs: {
              select: {
                batch_name: true,
                arrival_date: true,
              },
            },
          },
        },
      },
    });

    return penInfo?.pigs[0]?.pig_batchs || null;
  }

  async getExportProposals() {
  const today = new Date();

  const allPens = await (this.prisma as any).pens.findMany({
    include: {
      pigs: {
        include: {
          pig_batchs: true,
          pig_breeds: true,
        },
      },
    },
  });

  return allPens
    .map((pen) => {
      if (!pen.pigs.length) return null;

      const firstPig = pen.pigs[0];
      const arrivalDate = firstPig?.pig_batchs?.arrival_date;
      const breedName = firstPig?.pig_breeds?.breed_name || "N/A"; 
      const quantity = pen.pigs.length;

      if (!arrivalDate) return null;

      const expectedDate = new Date(arrivalDate);
      expectedDate.setDate(expectedDate.getDate() + 150); 

      const notificationDate = new Date(expectedDate);
      notificationDate.setDate(notificationDate.getDate() - 45);

      const rawWeight = pen.pigs.reduce((sum, pig) => sum + (pig.weight || 0), 0);
      const totalWeight = Math.round(rawWeight * 10) / 10;

      return {
        pen_name: pen.pen_name,
        quantity: quantity,    
        breed: breedName,
        total_weight: totalWeight, 
        arrival_date: arrivalDate,
        expected_date: expectedDate,
        notification_date: notificationDate,
        current_price: 60000,
        };
      })
      .filter((item) => {
        return item !== null && today >= item.notification_date;
      });
  }

  async findAllBreeds() {
    const breeds = await this.prisma.pig_breeds.findMany({
      include: {
        _count: {
          select: { pigs: true }, 
        },
      },
      orderBy: { breed_name: 'asc' },
    });

    return breeds.map((b) => ({
      id: b.id,
      breed_name: b.breed_name,
      hasPigs: b._count.pigs > 0, 
    }));
  }

  async createBreed(data: { breed_name: string }) {
    const existing = await this.prisma.pig_breeds.findFirst({
      where: { breed_name: data.breed_name },
    });

    if (existing) {
      throw new BadRequestException('Giống heo này đã tồn tại trong hệ thống');
    }

    return this.prisma.pig_breeds.create({
      data: { breed_name: data.breed_name },
    });
  }

  async removeBreeds(ids: string[]) {
    const breedsInUse = await this.prisma.pig_breeds.findMany({
      where: {
        id: { in: ids },
        pigs: { some: {} },
      },
      select: { breed_name: true },
    });

    if (breedsInUse.length > 0) {
      const names = breedsInUse.map((b) => b.breed_name).join(', ');
      throw new BadRequestException(
        `Không thể xóa giống heo: [${names}] vì đang có heo thuộc giống này.`,
      );
    }

    return this.prisma.pig_breeds.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async update(id: string, data: { breed_name: string }) {
    try {
      return await this.prisma.pig_breeds.update({
        where: { id },
        data: {
          breed_name: data.breed_name,
        },
      });
    } catch (error) {
      console.error("Lỗi Prisma (Breeds):", error.message);
      throw new BadRequestException("Không thể cập nhật giống heo");
    }
  }
  private readonly LIMITS = {
    temp: { min: 25, max: 38, warning: 33, danger: 36 },
    humidity: { min: 60, max: 95, warning: 85, danger: 90 },
  };


  private simulateEnvironment() {
    const temp =
      Math.random() * (this.LIMITS.temp.max - this.LIMITS.temp.min) +
      this.LIMITS.temp.min;
    
    const hum =
      Math.random() * (this.LIMITS.humidity.max - this.LIMITS.humidity.min) +
      this.LIMITS.humidity.min;

    return {
      temperature: parseFloat(temp.toFixed(1)),
      humidity: Math.floor(hum),
    };
  }

  async getDashboardStats(): Promise<PigDashboardStatsDto> {
    const activePensData = await this.prisma.pens.findMany({
      where: { current_quantity: { gt: 0 } },
    });

    const totalPigs = activePensData.reduce((sum, pen) => sum + (pen.current_quantity || 0), 0);
    const activePensCount = activePensData.length;

    const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();

    const newPigsCount = await this.prisma.pigs.count({
      where: {
        pig_batchs: {
          arrival_date: { gte: sevenDaysAgo }
        }
      }
    });

    let overheatedCount = 0;
    let highHumidityCount = 0;

    for (let i = 0; i < activePensCount; i++) {
      const env = this.simulateEnvironment();
      if (env.temperature >= this.LIMITS.temp.warning) overheatedCount++;
      if (env.humidity >= this.LIMITS.humidity.warning) highHumidityCount++;
    }

    return {
      totalPigs,
      activePens: activePensCount,
      overheatedPens: overheatedCount,
      highHumidityPens: highHumidityCount,
      newPigs7Days: newPigsCount,
    };
  }

  async getPenList(): Promise<PenItemDto[]> {
    const pens = await this.prisma.pens.findMany({
      orderBy: { pen_name: 'asc' } 
    });

    return pens.map((pen) => {
      const currentPigs = pen.current_quantity || 0;

      const env = this.simulateEnvironment();

      let status = 'normal';
      let statusLabel = 'Bình thường';
      let color = 'green'; 

      if (env.temperature >= this.LIMITS.temp.danger) {
        status = 'danger';
        statusLabel = 'Nguy hiểm';
        color = 'red';
      } else if (
        env.temperature >= this.LIMITS.temp.warning ||
        env.humidity >= this.LIMITS.humidity.warning
      ) {
        status = 'warning';
        statusLabel = 'Cảnh báo';
        color = 'orange'; 
      }

      return {
        id: pen.id,
        name: pen.pen_name || 'Không tên',
        currentPigs: currentPigs,
        capacity: pen.capacity || 100, 
        temperature: env.temperature,
        humidity: env.humidity,
        status,
        statusLabel,
        color,
      };
    });
  }
  async importPigBatch(dto: ImportPigBatchDto) {
    const { 
      penId, breedId, arrivalDate, quantity, vaccineIds, batchName, existingBatchId 
    } = dto;

    const pen = await (this.prisma as any).pens.findUnique({ where: { id: penId } });
    if (!pen) throw new BadRequestException('Chuồng không tồn tại');

    let defaultStatus = await (this.prisma as any).pig_statuses.findFirst({
      where: { status_name: { contains: 'Bình thường', mode: 'insensitive' } }
    });
    if (!defaultStatus) defaultStatus = await (this.prisma as any).pig_statuses.findFirst();
    if (!defaultStatus) throw new BadRequestException('Chưa có dữ liệu trạng thái heo');

    return (this.prisma as any).$transaction(async (tx) => {
      let batchId = existingBatchId;
      let batchData = null;

      if (existingBatchId) {
        const existingBatch = await tx.pig_batches.findUnique({ where: { id: existingBatchId } });
        if (!existingBatch) throw new BadRequestException('Lứa heo đã chọn không tồn tại');
        batchData = existingBatch;
      } else {
        const newBatch = await tx.pig_batches.create({
          data: {
            batch_name: batchName || `Lứa nhập ${new Date(arrivalDate).toLocaleDateString('vi-VN')}`,
            arrival_date: new Date(arrivalDate),
          },
        });
        batchId = newBatch.id;
        batchData = newBatch;
      }

      if (vaccineIds && vaccineIds.length > 0) {
      if (existingBatchId) {
        const duplicates = await tx.pig_batch_vaccines.findMany({
            where: {
              pig_batch_id: existingBatchId,
              vaccine_id: { in: vaccineIds }
            },
            include: { vaccines: true }
        });

        if (duplicates.length > 0) {
            throw new BadRequestException(`Lứa này đã tiêm các loại: ${duplicates.map(d => d.vaccines.vaccine_name).join(', ')}`);
        }
      }

      await tx.pig_batch_vaccines.createMany({
        data: vaccineIds.map((vId) => ({
          pig_batch_id: batchId,
          vaccine_id: vId,
        })),
      });
    }

      const pigsData: any[] = [];
      for (let i = 0; i < quantity; i++) {
        pigsData.push({
          pig_batch_id: batchId,
          pen_id: penId,
          pig_breed_id: breedId,
          ear_tag_number: '', 
          weight: 0,
          pig_status_id: defaultStatus.id,
        });
      }

      await tx.pigs.createMany({ data: pigsData });

      const createdPigs = await tx.pigs.findMany({
        where: {
          pig_batch_id: batchId,
          pen_id: penId,
          ear_tag_number: '' 
        },
        orderBy: { created_at: 'desc' },
        take: quantity 
      });

      await tx.pens.update({
        where: { id: penId },
        data: { current_quantity: { increment: quantity } },
      });

      return {
        message: existingBatchId ? 'Đã thêm heo vào lứa cũ thành công' : 'Tạo lứa mới thành công',
        batch: batchData,
        pigs: createdPigs,
      };
    }, { timeout: 10000 });
  }

  async updatePigDetails(dto: UpdatePigListDto) {
    const { items } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Danh sách cập nhật trống');
    }

    return (this.prisma as any).$transaction(async (tx) => {
      const updatePromises = items.map((item) => 
        tx.pigs.update({
          where: { id: item.id },
          data: {
            ear_tag_number: item.earTag,
            weight: item.weight,
          },
        })
      );

      const results = await Promise.all(updatePromises);

      return {
        message: `Đã cập nhật thông tin cho ${results.length} con heo`,
        updatedCount: results.length
      };
    });
  }

  async getIsolationPens() {
    return (this.prisma as any).pens.findMany({
      where: {
        pen_types: {
          pen_type_name: {
            contains: 'Cách ly',
            mode: 'insensitive'
          }
        }
      },
      select: {
        id: true,
        pen_name: true,
        capacity: true,
        current_quantity: true
      }
    });
  }

  async transferPigs(dto: TransferPigDto) {
    const { pigIds, targetPenId, isIsolation, diseaseDate, diseaseId, symptoms } = dto;

    const targetPen = await (this.prisma as any).pens.findUnique({ where: { id: targetPenId } });
    if (!targetPen) throw new BadRequestException('Chuồng đích không tồn tại');

    const totalPigsToMove = pigIds.length;
    const currentQty = targetPen.current_quantity || 0;
    const capacity = targetPen.capacity || 0;

    if (currentQty + totalPigsToMove > capacity) {
      throw new BadRequestException(
        `Chuồng đích không đủ chỗ. Hiện tại: ${currentQty}/${capacity}. Cần thêm: ${totalPigsToMove}`
      );
    }

    const pigsToMove = await (this.prisma as any).pigs.findMany({
      where: { id: { in: pigIds } },
      select: { id: true, pen_id: true }
    });

    if (pigsToMove.length !== totalPigsToMove) {
      throw new BadRequestException('Một số ID heo không tồn tại trong hệ thống');
    }

    const sourcePenCounts = {};
    for (const pig of pigsToMove) {
      if (pig.pen_id) {
        sourcePenCounts[pig.pen_id] = (sourcePenCounts[pig.pen_id] || 0) + 1;
      }
    }

    let sickStatusId = null;
    if (isIsolation) {
      if (!diseaseId || !diseaseDate) throw new BadRequestException('Vui lòng nhập ngày phát bệnh và loại bệnh');
      
      const sickStatus = await (this.prisma as any).pig_statuses.findFirst({
        where: { status_name: { contains: 'Bệnh', mode: 'insensitive' } }
      });
      if (sickStatus) sickStatusId = sickStatus.id;
    }

    return (this.prisma as any).$transaction(async (tx) => {
      
      for (const [oldPenId, count] of Object.entries(sourcePenCounts)) {
        await tx.pens.update({
          where: { id: oldPenId },
          data: { current_quantity: { decrement: Number(count) } }
        });
      }

      await tx.pens.update({
        where: { id: targetPenId },
        data: { current_quantity: { increment: totalPigsToMove } }
      });

      await tx.pigs.updateMany({
        where: { id: { in: pigIds } },
        data: { 
          pen_id: targetPenId,
          ...(isIsolation && sickStatusId ? { pig_status_id: sickStatusId } : {})
        }
      });

      const transferLogs = pigsToMove.map(pig => ({
        pig_id: pig.id,
        old_pen_id: pig.pen_id,
        new_pen_id: targetPenId,
      }));
      await tx.pig_transfers.createMany({ data: transferLogs });

      if (isIsolation) {
        const treatment = await tx.disease_treatments.create({
          data: {
            pen_id: targetPenId,
            disease_id: diseaseId,
            symptom: symptoms || '',
            status: 'TREATING',
            created_at: new Date(diseaseDate || new Date()) 
          }
        });

        const treatmentDetails = pigIds.map(pId => ({
          pig_id: pId,
          treatment_id: treatment.id,
          status: 'SICK' 
        }));
        
        await tx.pig_in_treatment.createMany({ data: treatmentDetails });
      }

      return {
        message: 'Chuyển chuồng thành công',
        movedCount: totalPigsToMove,
        targetPenId: targetPenId,
        isIsolationTransfer: isIsolation
      };
    });
  }

  async getAllBatches() {
    return (this.prisma as any).pig_batches.findMany({
      orderBy: { arrival_date: 'desc' }, 
      select: {
        id: true,
        batch_name: true,
        arrival_date: true,
      }
    });
  }

  async getRegularPens() {
    return (this.prisma as any).pens.findMany({
      where: {
        pen_types: {
          pen_type_name: {
            contains: 'Chuồng thịt', 
            mode: 'insensitive'
          }
        }
      },
      select: {
        id: true,
        pen_name: true,
        capacity: true,
        current_quantity: true
      },
      orderBy: { pen_name: 'asc' }
    });
  }
}