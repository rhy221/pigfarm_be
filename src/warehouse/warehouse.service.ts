// src/warehouse/warehouse.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { material_categories } from '../generated/prisma/client';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  async findAllCategories() {
    return this.prisma.warehouse_categories.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(data: {
    name: string;
    type: string;
    description?: string;
  }) {
    return this.prisma.warehouse_categories.create({
      data: {
        name: data.name,
        type: data.type.toLowerCase() as material_categories,
        description: data.description || '',
        is_active: true,
      },
    });
  }

  async updateCategory(
    id: string,
    data: { name?: string; description?: string; type?: string },
  ) {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined)
      updatePayload.description = data.description;
    if (data.type !== undefined) updatePayload.type = data.type.toLowerCase();

    return this.prisma.warehouse_categories.update({
      where: { id },
      data: updatePayload,
    });
  }

  async removeManyCategories(ids: string[]) {
    const inUse = await this.prisma.warehouse_categories.findMany({
      where: {
        id: { in: ids },
        products: { some: {} },
      },
      select: { name: true },
    });

    if (inUse.length > 0) {
      const names = inUse.map((i) => i.name).join(', ');
      throw new BadRequestException(
        `Không thể xóa các loại: [${names}] vì đang có sản phẩm liên kết.`,
      );
    }

    return this.prisma.warehouse_categories.deleteMany({
      where: { id: { in: ids } },
    });
  }

  // ============ QUẢN LÝ KHO ============

  // async getWarehouses() {
  //   return this.prisma.warehouse.findMany({
  //     where: { isActive: true },
  //     include: {
  //       _count: {
  //         select: { materials: true }
  //       }
  //     },
  //     orderBy: { createdAt: 'desc' }
  //   });
  // }

  // async createWarehouse(data: {
  //   name: string;
  //   type: WarehouseType;
  //   location?: string;
  //   capacity?: number;
  //   description?: string;
  // }) {
  //   return this.prisma.warehouse.create({ data });
  // }

  // async updateWarehouse(id: string, data: any) {
  //   return this.prisma.warehouse.update({
  //     where: { id },
  //     data
  //   });
  // }

  // async deleteWarehouse(id: string) {
  //   // Kiểm tra kho có vật tư không
  //   const materialCount = await this.prisma.material.count({
  //     where: { warehouseId: id }
  //   });

  //   if (materialCount > 0) {
  //     throw new BadRequestException('Không thể xóa kho đang có vật tư');
  //   }

  //   return this.prisma.warehouse.delete({ where: { id } });
  // }

  // // ============ QUẢN LÝ VẬT TƯ ============

  // async getMaterials(filters?: {
  //   warehouseId?: string;
  //   category?: MaterialCategory;
  //   search?: string;
  //   lowStock?: boolean;
  // }) {
  //   const where: any = { isActive: true };

  //   if (filters?.warehouseId) {
  //     where.warehouseId = filters.warehouseId;
  //   }

  //   if (filters?.category) {
  //     where.category = filters.category;
  //   }

  //   if (filters?.search) {
  //     where.OR = [
  //       { name: { contains: filters.search, mode: 'insensitive' } },
  //       { code: { contains: filters.search, mode: 'insensitive' } }
  //     ];
  //   }

  //   if (filters?.lowStock) {
  //     where.totalStock = { lte: this.prisma.material.fields.minStock };
  //   }

  //   return this.prisma.material.findMany({
  //     where,
  //     include: {
  //       warehouse: true,
  //       _count: {
  //         select: { batches: true }
  //       }
  //     },
  //     orderBy: { createdAt: 'desc' }
  //   });
  // }

  // async getMaterial(id: string) {
  //   const material = await this.prisma.material.findUnique({
  //     where: { id },
  //     include: {
  //       warehouse: true,
  //       batches: {
  //         where: { isActive: true },
  //         orderBy: { expiryDate: 'asc' }
  //       }
  //     }
  //   });

  //   if (!material) {
  //     throw new NotFoundException('Không tìm thấy vật tư');
  //   }

  //   return material;
  // }

  // async createMaterial(data: {
  //   warehouseId: string;
  //   code: string;
  //   name: string;
  //   category: MaterialCategory;
  //   unit: string;
  //   specification?: string;
  //   minStock?: number;
  //   maxStock?: number;
  //   salePrice?: number;
  // }) {
  //   // Kiểm tra mã vật tư đã tồn tại
  //   const existing = await this.prisma.material.findUnique({
  //     where: { code: data.code }
  //   });

  //   if (existing) {
  //     throw new BadRequestException('Mã vật tư đã tồn tại');
  //   }

  //   return this.prisma.material.create({ data });
  // }

  // async updateMaterial(id: string, data: any) {
  //   return this.prisma.material.update({
  //     where: { id },
  //     data
  //   });
  // }

  // async deleteMaterial(id: string) {
  //   // Kiểm tra vật tư có tồn kho không
  //   const material = await this.prisma.material.findUnique({
  //     where: { id }
  //   });

  //   if (material && material.totalStock > 0) {
  //     throw new BadRequestException('Không thể xóa vật tư đang có tồn kho');
  //   }

  //   return this.prisma.material.delete({ where: { id } });
  // }

  // // ============ BÁO CÁO & THỐNG KÊ ============

  // async getDashboardStats() {
  //   // Tổng giá trị tồn kho
  //   const materials = await this.prisma.material.findMany({
  //     where: { isActive: true },
  //     select: {
  //       totalStock: true,
  //       avgCostPrice: true
  //     }
  //   });

  //   const totalValue = materials.reduce((sum, m) => {
  //     const price = m.avgCostPrice ? parseFloat(m.avgCostPrice.toString()) : 0;
  //     return sum + (m.totalStock * price);
  //   }, 0);

  //   // Vật tư tồn kho thấp
  //   const lowStockCount = await this.prisma.material.count({
  //     where: {
  //       isActive: true,
  //       totalStock: { lte: this.prisma.material.fields.minStock }
  //     }
  //   });

  //   // Lô hàng sắp hết hạn
  //   const nextMonth = new Date();
  //   nextMonth.setMonth(nextMonth.getMonth() + 1);

  //   const expiringBatches = await this.prisma.materialBatch.count({
  //     where: {
  //       isActive: true,
  //       remainQuantity: { gt: 0 },
  //       expiryDate: {
  //         gte: new Date(),
  //         lte: nextMonth
  //       }
  //     }
  //   });

  //   // Lô đã hết hạn
  //   const expiredBatches = await this.prisma.materialBatch.count({
  //     where: {
  //       isActive: true,
  //       remainQuantity: { gt: 0 },
  //       expiryDate: { lt: new Date() }
  //     }
  //   });

  //   return {
  //     totalValue,
  //     lowStockCount,
  //     expiringBatches,
  //     expiredBatches
  //   };
  // }

  // async getInventoryReport(filters?: {
  //   warehouseId?: string;
  //   category?: MaterialCategory;
  //   fromDate?: Date;
  //   toDate?: Date;
  // }) {
  //   const materials = await this.getMaterials({
  //     warehouseId: filters?.warehouseId,
  //     category: filters?.category
  //   });

  //   return materials.map(material => ({
  //     code: material.code,
  //     name: material.name,
  //     category: material.category,
  //     unit: material.unit,
  //     totalStock: material.totalStock,
  //     availableStock: material.availableStock,
  //     reservedStock: material.reservedStock,
  //     avgCostPrice: material.avgCostPrice,
  //     totalValue: material.totalStock * (material.avgCostPrice ? parseFloat(material.avgCostPrice.toString()) : 0),
  //     warehouse: material.warehouse.name
  //   }));
  // }

  // async getLowStockMaterials() {
  //   return this.prisma.material.findMany({
  //     where: {
  //       isActive: true,
  //       OR: [
  //         { totalStock: { lte: this.prisma.material.fields.minStock } },
  //         {
  //           AND: [
  //             { minStock: { gt: 0 } },
  //             { totalStock: { lte: this.prisma.material.fields.minStock } }
  //           ]
  //         }
  //       ]
  //     },
  //     include: {
  //       warehouse: true
  //     },
  //     orderBy: { totalStock: 'asc' }
  //   });
  // }

  // async getExpiringBatches(days: number = 30) {
  //   const targetDate = new Date();
  //   targetDate.setDate(targetDate.getDate() + days);

  //   return this.prisma.materialBatch.findMany({
  //     where: {
  //       isActive: true,
  //       remainQuantity: { gt: 0 },
  //       expiryDate: {
  //         gte: new Date(),
  //         lte: targetDate
  //       }
  //     },
  //     include: {
  //       material: {
  //         include: {
  //           warehouse: true
  //         }
  //       }
  //     },
  //     orderBy: { expiryDate: 'asc' }
  //   });
  // }

  // async getExpiredBatches() {
  //   const batches = await this.prisma.materialBatch.findMany({
  //     where: {
  //       isActive: true,
  //       remainQuantity: { gt: 0 },
  //       expiryDate: { lt: new Date() },
  //       isExpired: false
  //     },
  //     include: {
  //       material: {
  //         include: {
  //           warehouse: true
  //         }
  //       }
  //     },
  //     orderBy: { expiryDate: 'asc' }
  //   });

  //   // Đánh dấu đã hết hạn
  //   if (batches.length > 0) {
  //     await this.prisma.materialBatch.updateMany({
  //       where: {
  //         id: { in: batches.map(b => b.id) }
  //       },
  //       data: { isExpired: true }
  //     });
  //   }

  //   return batches;
  // }
}
