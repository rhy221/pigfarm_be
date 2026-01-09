// =====================================================
// INVENTORY MODULE - SERVICE
// =====================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateWarehouseCategoryDto,
  UpdateWarehouseCategoryDto,
  CreateUnitDto,
  UpdateUnitDto,
  CreateProductDto,
  UpdateProductDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateStockReceiptDto,
  UpdateStockReceiptDto,
  CreateStockIssueDto,
  UpdateStockIssueDto,
  CreateInventoryCheckDto,
  InventoryQueryDto,
  StockReceiptQueryDto,
  StockIssueQueryDto,
  InventoryHistoryQueryDto,
  DocumentStatus,
} from './inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ============ HELPER METHODS ============
  private async generateDocumentCode(farmId: string, prefix: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    let count = 1;
    if (prefix === 'PN') {
      count = await this.prisma.stockReceipt.count({
        where: {
          farmId,
          receiptDate: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
        },
      }) + 1;
    } else if (prefix === 'PX') {
      count = await this.prisma.stockIssue.count({
        where: {
          farmId,
          issueDate: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
        },
      }) + 1;
    } else if (prefix === 'KK') {
      count = await this.prisma.inventoryCheck.count({
        where: {
          farmId,
          checkDate: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
        },
      }) + 1;
    }
    
    return `${prefix}-${dateStr}-${String(count).padStart(3, '0')}`;
  }

  // ============ WAREHOUSE METHODS ============
  async createWarehouse(dto: CreateWarehouseDto) {
    // Nếu set là default, unset các kho khác
    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { farmId: dto.farmId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.warehouse.create({
      data: dto,
    });
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      throw new NotFoundException('Không tìm thấy kho');
    }
    // Nếu set là default, unset các kho khác
    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { farmId: warehouse.farmId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });
  }

  async deleteWarehouse(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      throw new NotFoundException('Không tìm thấy kho');
    }
    return this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getWarehouses(farmId: string) {
    return this.prisma.warehouse.findMany({
      where: { farmId, isActive: true },
      include: {
        _count: {
          select: { inventory: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' }, // Default warehouse first
        { name: 'asc' },
      ],
    });
  }

  async getWarehouseById(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            product: {
              include: { unit: true, category: true },
            },
          },
        },
      },
    });
    if (!warehouse) {
      throw new NotFoundException('Không tìm thấy kho');
    }
    return warehouse;
  }

  // ============ WAREHOUSE CATEGORY METHODS ============
  async createWarehouseCategory(dto: CreateWarehouseCategoryDto) {
    return this.prisma.warehouseCategory.create({ data: dto });
  }

  async updateWarehouseCategory(id: string, dto: UpdateWarehouseCategoryDto) {
    return this.prisma.warehouseCategory.update({ where: { id }, data: dto });
  }

  async getWarehouseCategories(farmId: string) {
    return this.prisma.warehouseCategory.findMany({
      where: { farmId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ============ UNIT METHODS ============
  async createUnit(dto: CreateUnitDto) {
    return this.prisma.unit.create({ data: dto });
  }

  async updateUnit(id: string, dto: UpdateUnitDto) {
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async getUnits(farmId: string) {
    return this.prisma.unit.findMany({
      where: { farmId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ============ PRODUCT METHODS ============
  async createProduct(dto: CreateProductDto) {
    if (!dto.code) {
      const count = await this.prisma.product.count({ where: { farmId: dto.farmId } });
      dto.code = `SP${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.product.create({
      data: dto,
      include: { category: true, unit: true },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, unit: true },
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getProducts(farmId: string, categoryId?: string, search?: string) {
    const where: Prisma.ProductWhereInput = {
      farmId,
      isActive: true,
    };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      include: { category: true, unit: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, unit: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  // ============ SUPPLIER METHODS ============
  async createSupplier(dto: CreateSupplierDto) {
    if (!dto.code) {
      const count = await this.prisma.supplier.count({ where: { farmId: dto.farmId } });
      dto.code = `NCC${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.supplier.create({ data: dto });
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async deleteSupplier(id: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getSuppliers(farmId: string, search?: string) {
    const where: Prisma.SupplierWhereInput = { farmId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    return this.prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
  }

  async getSupplierById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    return supplier;
  }

  async getSupplierDebtHistory(supplierId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.supplierDebt.findMany({
        where: { supplierId },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supplierDebt.count({ where: { supplierId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ============ INVENTORY METHODS ============
  async getInventory(query: InventoryQueryDto) {
    const { farmId, warehouseId, categoryId, search, stockStatus, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {};
    if (farmId) where.farmId = farmId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (categoryId) where.product = { categoryId };
    if (search) {
      where.product = {
        ...where.product as object,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          warehouse: true,
          product: { include: { category: true, unit: true } },
        },
        skip,
        take: limit,
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    // Filter by stock status if needed
    let filteredData = data;
    if (stockStatus && stockStatus !== 'all') {
      filteredData = data.filter((item) => {
        const qty = Number(item.quantity);
        const minQty = Number(item.product.minQuantity);
        if (stockStatus === 'out_of_stock') return qty <= 0;
        if (stockStatus === 'low_stock') return qty > 0 && qty <= minQty;
        if (stockStatus === 'in_stock') return qty > minQty;
        return true;
      });
    }

    return {
      data: filteredData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInventorySummary(farmId: string) {
    const inventory = await this.prisma.inventory.findMany({
      where: { farmId },
      include: {
        product: { include: { category: true } },
      },
    });

    const summary = {
      totalProducts: inventory.length,
      totalValue: 0,
      outOfStock: 0,
      lowStock: 0,
      inStock: 0,
      byCategory: {} as Record<string, { count: number; value: number }>,
    };

    inventory.forEach((item) => {
      const qty = Number(item.quantity);
      const cost = Number(item.avgCost);
      const minQty = Number(item.product.minQuantity);
      const value = qty * cost;

      summary.totalValue += value;

      if (qty <= 0) summary.outOfStock++;
      else if (qty <= minQty) summary.lowStock++;
      else summary.inStock++;

      const categoryName = item.product.category?.name || 'Chưa phân loại';
      if (!summary.byCategory[categoryName]) {
        summary.byCategory[categoryName] = { count: 0, value: 0 };
      }
      summary.byCategory[categoryName].count++;
      summary.byCategory[categoryName].value += value;
    });

    return summary;
  }

  // ============ STOCK RECEIPT METHODS ============
  async createStockReceipt(dto: CreateStockReceiptDto, createdById?: string) {
    const receiptDate = new Date(dto.receiptDate);
    const receiptCode = await this.generateDocumentCode(dto.farmId, 'PN', receiptDate);

    // Calculate totals
    let totalAmount = 0;
    const itemsData = dto.items.map((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const discountAmt = item.discountAmount || (itemTotal * (item.discountPercent || 0)) / 100;
      const afterDiscount = itemTotal - discountAmt;
      const taxAmt = item.taxAmount || (afterDiscount * (item.taxPercent || 0)) / 100;
      const finalTotal = afterDiscount + taxAmt;
      totalAmount += finalTotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        discountAmount: discountAmt,
        taxPercent: item.taxPercent || 0,
        taxAmount: taxAmt,
        totalAmount: finalTotal,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        batchNumber: item.batchNumber,
        notes: item.notes,
      };
    });

    const discountAmount = dto.discountAmount || 0;
    const taxAmount = dto.taxAmount || 0;
    const shippingFee = dto.shippingFee || 0;
    const finalAmount = totalAmount - discountAmount + taxAmount + shippingFee;
    const paidAmount = dto.paidAmount || 0;
    const debtAmount = finalAmount - paidAmount;

    let paymentStatus = 'unpaid';
    if (paidAmount >= finalAmount) paymentStatus = 'paid';
    else if (paidAmount > 0) paymentStatus = 'partial';

    return this.prisma.stockReceipt.create({
      data: {
        farmId: dto.farmId,
        warehouseId: dto.warehouseId,
        supplierId: dto.supplierId,
        receiptCode,
        receiptDate,
        receiptType: dto.receiptType || 'purchase',
        totalAmount,
        discountAmount,
        taxAmount,
        shippingFee,
        finalAmount,
        paidAmount,
        debtAmount,
        paymentStatus,
        notes: dto.notes,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
        createdById,
        status: 'draft',
        items: { create: itemsData },
      },
      include: {
        items: { include: { product: { include: { unit: true } } } },
        supplier: true,
        warehouse: true,
      },
    });
  }

  async updateStockReceipt(id: string, dto: UpdateStockReceiptDto) {
    const receipt = await this.prisma.stockReceipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (receipt.status === 'confirmed') {
      throw new BadRequestException('Không thể sửa phiếu đã xác nhận');
    }

    // Delete old items and recreate
    if (dto.items) {
      await this.prisma.stockReceiptItem.deleteMany({ where: { receiptId: id } });

      let totalAmount = 0;
      const itemsData = dto.items.map((item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const discountAmt = item.discountAmount || (itemTotal * (item.discountPercent || 0)) / 100;
        const afterDiscount = itemTotal - discountAmt;
        const taxAmt = item.taxAmount || (afterDiscount * (item.taxPercent || 0)) / 100;
        const finalTotal = afterDiscount + taxAmt;
        totalAmount += finalTotal;

        return {
          receiptId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          discountAmount: discountAmt,
          taxPercent: item.taxPercent || 0,
          taxAmount: taxAmt,
          totalAmount: finalTotal,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          batchNumber: item.batchNumber,
          notes: item.notes,
        };
      });

      await this.prisma.stockReceiptItem.createMany({ data: itemsData });

      const discountAmount = dto.discountAmount ?? Number(receipt.discountAmount);
      const taxAmount = dto.taxAmount ?? Number(receipt.taxAmount);
      const shippingFee = dto.shippingFee ?? Number(receipt.shippingFee);
      const finalAmount = totalAmount - discountAmount + taxAmount + shippingFee;
      const paidAmount = dto.paidAmount ?? Number(receipt.paidAmount);
      const debtAmount = finalAmount - paidAmount;

      let paymentStatus = 'unpaid';
      if (paidAmount >= finalAmount) paymentStatus = 'paid';
      else if (paidAmount > 0) paymentStatus = 'partial';

      return this.prisma.stockReceipt.update({
        where: { id },
        data: {
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId,
          receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : undefined,
          receiptType: dto.receiptType,
          totalAmount,
          discountAmount,
          taxAmount,
          shippingFee,
          finalAmount,
          paidAmount,
          debtAmount,
          paymentStatus,
          notes: dto.notes,
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
        },
        include: {
          items: { include: { product: { include: { unit: true } } } },
          supplier: true,
          warehouse: true,
        },
      });
    }

    return this.prisma.stockReceipt.update({
      where: { id },
      data: {
        notes: dto.notes,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
      },
      include: {
        items: { include: { product: { include: { unit: true } } } },
        supplier: true,
        warehouse: true,
      },
    });
  }

  async confirmStockReceipt(id: string, approvedById?: string) {
    const receipt = await this.prisma.stockReceipt.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (receipt.status === 'confirmed') {
      throw new BadRequestException('Phiếu đã được xác nhận');
    }

    // Update inventory using transaction
    await this.prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        const inventory = await tx.inventory.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: receipt.warehouseId,
              productId: item.productId,
            },
          },
        });

        const currentQty = inventory ? Number(inventory.quantity) : 0;
        const currentCost = inventory ? Number(inventory.avgCost) : 0;
        const newQty = currentQty + Number(item.quantity);
        const newCost = newQty > 0
          ? ((currentQty * currentCost) + (Number(item.quantity) * Number(item.unitPrice))) / newQty
          : Number(item.unitPrice);

        await tx.inventory.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: receipt.warehouseId,
              productId: item.productId,
            },
          },
          create: {
            farmId: receipt.farmId,
            warehouseId: receipt.warehouseId,
            productId: item.productId,
            quantity: Number(item.quantity),
            avgCost: Number(item.unitPrice),
          },
          update: {
            quantity: newQty,
            avgCost: newCost,
            lastUpdated: new Date(),
          },
        });

        // Create inventory history
        await tx.inventoryHistory.create({
          data: {
            farmId: receipt.farmId,
            warehouseId: receipt.warehouseId,
            productId: item.productId,
            transactionType: 'in',
            referenceType: 'receipt',
            referenceId: receipt.id,
            quantityBefore: currentQty,
            quantityChange: Number(item.quantity),
            quantityAfter: newQty,
            unitCost: Number(item.unitPrice),
            totalCost: Number(item.totalAmount),
            createdById: approvedById,
          },
        });
      }

      // Update supplier debt if applicable
      if (receipt.supplierId && Number(receipt.debtAmount) > 0) {
        const supplier = await tx.supplier.findUnique({
          where: { id: receipt.supplierId },
        });
        const balanceBefore = supplier ? Number(supplier.totalDebt) : 0;
        const balanceAfter = balanceBefore + Number(receipt.debtAmount);

        await tx.supplier.update({
          where: { id: receipt.supplierId },
          data: { totalDebt: balanceAfter },
        });

        await tx.supplierDebt.create({
          data: {
            farmId: receipt.farmId,
            supplierId: receipt.supplierId,
            referenceType: 'stock_receipt',
            referenceId: receipt.id,
            transactionDate: receipt.receiptDate,
            debtAmount: Number(receipt.debtAmount),
            paymentAmount: 0,
            balanceBefore,
            balanceAfter,
          },
        });
      }

      // Update receipt status
      await tx.stockReceipt.update({
        where: { id },
        data: {
          status: 'confirmed',
          approvedById,
        },
      });
    });

    return this.getStockReceiptById(id);
  }

  async cancelStockReceipt(id: string) {
    const receipt = await this.prisma.stockReceipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (receipt.status === 'confirmed') {
      throw new BadRequestException('Không thể hủy phiếu đã xác nhận');
    }

    return this.prisma.stockReceipt.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async getStockReceipts(query: StockReceiptQueryDto) {
    const { farmId, warehouseId, supplierId, fromDate, toDate, status, paymentStatus, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StockReceiptWhereInput = {};
    if (farmId) where.farmId = farmId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (fromDate || toDate) {
      where.receiptDate = {};
      if (fromDate) where.receiptDate.gte = new Date(fromDate);
      if (toDate) where.receiptDate.lte = new Date(toDate);
    }
    if (search) {
      where.OR = [
        { receiptCode: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stockReceipt.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          createdBy: { select: { id: true, fullName: true } },
        },
        skip,
        take: limit,
        orderBy: { receiptDate: 'desc' },
      }),
      this.prisma.stockReceipt.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStockReceiptById(id: string) {
    const receipt = await this.prisma.stockReceipt.findUnique({
      where: { id },
      include: {
        items: { include: { product: { include: { unit: true, category: true } } } },
        supplier: true,
        warehouse: true,
        createdBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    return receipt;
  }

  // ============ STOCK ISSUE METHODS ============
  async createStockIssue(dto: CreateStockIssueDto, createdById?: string) {
    const issueDate = new Date(dto.issueDate);
    const issueCode = await this.generateDocumentCode(dto.farmId, 'PX', issueDate);

    // Validate inventory and get unit costs
    const itemsData = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      const inventory = await this.prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: dto.warehouseId,
            productId: item.productId,
          },
        },
      });

      if (!inventory || Number(inventory.quantity) < item.quantity) {
        const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
        throw new BadRequestException(
          `Sản phẩm "${product?.name || item.productId}" không đủ số lượng trong kho`
        );
      }

      const unitCost = Number(inventory.avgCost);
      const itemTotal = item.quantity * unitCost;
      totalAmount += itemTotal;

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitCost,
        totalAmount: itemTotal,
        notes: item.notes,
      });
    }

    return this.prisma.stockIssue.create({
      data: {
        farmId: dto.farmId,
        warehouseId: dto.warehouseId,
        issueCode,
        issueDate,
        issueType: dto.issueType || 'usage',
        purpose: dto.purpose,
        totalAmount,
        notes: dto.notes,
        pigBatchId: dto.pigBatchId,
        createdById,
        status: 'draft',
        items: { create: itemsData },
      },
      include: {
        items: { include: { product: { include: { unit: true } } } },
        warehouse: true,
      },
    });
  }

  async confirmStockIssue(id: string, approvedById?: string) {
    const issue = await this.prisma.stockIssue.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!issue) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    if (issue.status === 'confirmed') {
      throw new BadRequestException('Phiếu đã được xác nhận');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of issue.items) {
        const inventory = await tx.inventory.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: issue.warehouseId,
              productId: item.productId,
            },
          },
        });

        if (!inventory || Number(inventory.quantity) < Number(item.quantity)) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          throw new BadRequestException(
            `Sản phẩm "${product?.name}" không đủ số lượng trong kho`
          );
        }

        const currentQty = Number(inventory.quantity);
        const newQty = currentQty - Number(item.quantity);

        await tx.inventory.update({
          where: {
            warehouseId_productId: {
              warehouseId: issue.warehouseId,
              productId: item.productId,
            },
          },
          data: {
            quantity: newQty,
            lastUpdated: new Date(),
          },
        });

        await tx.inventoryHistory.create({
          data: {
            farmId: issue.farmId,
            warehouseId: issue.warehouseId,
            productId: item.productId,
            transactionType: 'out',
            referenceType: 'issue',
            referenceId: issue.id,
            quantityBefore: currentQty,
            quantityChange: Number(item.quantity),
            quantityAfter: newQty,
            unitCost: Number(item.unitCost),
            totalCost: Number(item.totalAmount),
            createdById: approvedById,
          },
        });
      }

      await tx.stockIssue.update({
        where: { id },
        data: {
          status: 'confirmed',
          approvedById,
        },
      });
    });

    return this.getStockIssueById(id);
  }

  async cancelStockIssue(id: string) {
    const issue = await this.prisma.stockIssue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    if (issue.status === 'confirmed') {
      throw new BadRequestException('Không thể hủy phiếu đã xác nhận');
    }
    return this.prisma.stockIssue.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async getStockIssues(query: StockIssueQueryDto) {
    const { farmId, warehouseId, fromDate, toDate, status, issueType, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StockIssueWhereInput = {};
    if (farmId) where.farmId = farmId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (issueType) where.issueType = issueType;
    if (fromDate || toDate) {
      where.issueDate = {};
      if (fromDate) where.issueDate.gte = new Date(fromDate);
      if (toDate) where.issueDate.lte = new Date(toDate);
    }
    if (search) {
      where.OR = [
        { issueCode: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stockIssue.findMany({
        where,
        include: {
          warehouse: true,
          createdBy: { select: { id: true, fullName: true } },
        },
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
      }),
      this.prisma.stockIssue.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStockIssueById(id: string) {
    const issue = await this.prisma.stockIssue.findUnique({
      where: { id },
      include: {
        items: { include: { product: { include: { unit: true, category: true } } } },
        warehouse: true,
        createdBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!issue) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    return issue;
  }

  // ============ INVENTORY HISTORY METHODS ============
  async getInventoryHistory(query: InventoryHistoryQueryDto) {
    const { farmId, warehouseId, productId, fromDate, toDate, transactionType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryHistoryWhereInput = {};
    if (farmId) where.farmId = farmId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (transactionType) where.transactionType = transactionType;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryHistory.findMany({
        where,
        include: {
          product: { include: { unit: true } },
          warehouse: true,
          createdBy: { select: { id: true, fullName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryHistory.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ============ INVENTORY CHECK METHODS ============
  async createInventoryCheck(dto: CreateInventoryCheckDto, createdById?: string) {
    const checkDate = new Date(dto.checkDate);
    const checkCode = await this.generateDocumentCode(dto.farmId, 'KK', checkDate);

    const itemsData = [];
    for (const item of dto.items) {
      const inventory = await this.prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: dto.warehouseId,
            productId: item.productId,
          },
        },
      });

      const systemQuantity = inventory ? Number(inventory.quantity) : 0;
      const unitCost = inventory ? Number(inventory.avgCost) : 0;
      const difference = item.actualQuantity - systemQuantity;
      const differenceValue = difference * unitCost;

      itemsData.push({
        productId: item.productId,
        systemQuantity,
        actualQuantity: item.actualQuantity,
        difference,
        unitCost,
        differenceValue,
        notes: item.notes,
      });
    }

    return this.prisma.inventoryCheck.create({
      data: {
        farmId: dto.farmId,
        warehouseId: dto.warehouseId,
        checkCode,
        checkDate,
        notes: dto.notes,
        createdById,
        status: 'draft',
        items: { create: itemsData },
      },
      include: {
        items: { include: { product: { include: { unit: true } } } },
        warehouse: true,
      },
    });
  }

  async confirmInventoryCheck(id: string, approvedById?: string) {
    const check = await this.prisma.inventoryCheck.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!check) throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    if (check.status === 'confirmed') {
      throw new BadRequestException('Phiếu đã được xác nhận');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of check.items) {
        if (Number(item.difference) !== 0) {
          const inventory = await tx.inventory.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: check.warehouseId,
                productId: item.productId,
              },
            },
          });

          const currentQty = inventory ? Number(inventory.quantity) : 0;

          await tx.inventory.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: check.warehouseId,
                productId: item.productId,
              },
            },
            create: {
              farmId: check.farmId,
              warehouseId: check.warehouseId,
              productId: item.productId,
              quantity: Number(item.actualQuantity),
              avgCost: Number(item.unitCost),
            },
            update: {
              quantity: Number(item.actualQuantity),
              lastUpdated: new Date(),
            },
          });

          await tx.inventoryHistory.create({
            data: {
              farmId: check.farmId,
              warehouseId: check.warehouseId,
              productId: item.productId,
              transactionType: 'adjustment',
              referenceType: 'check',
              referenceId: check.id,
              quantityBefore: currentQty,
              quantityChange: Number(item.difference),
              quantityAfter: Number(item.actualQuantity),
              unitCost: Number(item.unitCost),
              totalCost: Math.abs(Number(item.differenceValue)),
              notes: `Kiểm kê điều chỉnh: ${item.notes || ''}`,
              createdById: approvedById,
            },
          });
        }
      }

      await tx.inventoryCheck.update({
        where: { id },
        data: {
          status: 'confirmed',
          approvedById,
        },
      });
    });

    return this.prisma.inventoryCheck.findUnique({
      where: { id },
      include: {
        items: { include: { product: { include: { unit: true } } } },
        warehouse: true,
      },
    });
  }

  // ============ EXPIRY ALERT METHODS ============

  async getExpirySummary(farmId: string) {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        farmId,
        status: 'active',
        quantity: { gt: 0 },
        expiryDate: { not: null },
      },
      select: {
        quantity: true,
        unitCost: true,
        expiryDate: true,
      },
    });

    let expiredCount = 0, criticalCount = 0, warningCount = 0, noticeCount = 0;
    let expiredValue = 0, criticalValue = 0, warningValue = 0;

    batches.forEach(batch => {
      const value = Number(batch.quantity) * Number(batch.unitCost);
      const expiryDate = batch.expiryDate!;

      if (expiryDate < now) {
        expiredCount++;
        expiredValue += value;
      } else if (expiryDate <= sevenDaysLater) {
        criticalCount++;
        criticalValue += value;
      } else if (expiryDate <= thirtyDaysLater) {
        warningCount++;
        warningValue += value;
      } else if (expiryDate <= ninetyDaysLater) {
        noticeCount++;
      }
    });

    return {
      expiredCount,
      criticalCount,
      warningCount,
      noticeCount,
      expiredValue,
      criticalValue,
      warningValue,
      totalAlerts: expiredCount + criticalCount + warningCount + noticeCount,
    };
  }

  async getExpiryAlerts(query: {
    farmId: string;
    expiryStatus?: string;
    warehouseId?: string;
    categoryId?: string;
    productId?: string;
    page?: number;
    limit?: number;
  }) {
    const { farmId, expiryStatus, warehouseId, categoryId, productId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Build expiry date filter based on status
    let expiryDateFilter: any = { not: null };
    if (expiryStatus === 'expired') {
      expiryDateFilter = { lt: now };
    } else if (expiryStatus === 'critical') {
      expiryDateFilter = { gte: now, lte: sevenDaysLater };
    } else if (expiryStatus === 'warning') {
      expiryDateFilter = { gt: sevenDaysLater, lte: thirtyDaysLater };
    } else if (expiryStatus === 'notice') {
      expiryDateFilter = { gt: thirtyDaysLater, lte: ninetyDaysLater };
    } else if (expiryStatus === 'good') {
      expiryDateFilter = { gt: ninetyDaysLater };
    }

    const where: any = {
      farmId,
      status: 'active',
      quantity: { gt: 0 },
      expiryDate: expiryDateFilter,
    };

    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (categoryId) {
      where.product = { categoryId };
    }

    const [batches, total] = await Promise.all([
      this.prisma.inventoryBatch.findMany({
        where,
        include: {
          warehouse: true,
          product: {
            include: {
              unit: true,
              category: true,
            },
          },
        },
        orderBy: [
          { expiryDate: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.inventoryBatch.count({ where }),
    ]);

    // Calculate expiry status for each batch
    const data = batches.map(batch => {
      const daysUntilExpiry = batch.expiryDate
        ? Math.ceil((batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      let status = 'no_expiry';
      if (batch.expiryDate) {
        if (batch.expiryDate < now) status = 'expired';
        else if (batch.expiryDate <= sevenDaysLater) status = 'critical';
        else if (batch.expiryDate <= thirtyDaysLater) status = 'warning';
        else if (batch.expiryDate <= ninetyDaysLater) status = 'notice';
        else status = 'good';
      }

      return {
        batchId: batch.id,
        warehouseId: batch.warehouseId,
        warehouseName: batch.warehouse.name,
        productId: batch.productId,
        productCode: batch.product.code,
        productName: batch.product.name,
        categoryName: batch.product.category?.name,
        categoryType: batch.product.category?.type,
        unitName: batch.product.unit?.name,
        batchNumber: batch.batchNumber,
        quantity: Number(batch.quantity),
        unitCost: Number(batch.unitCost),
        totalValue: Number(batch.quantity) * Number(batch.unitCost),
        manufacturingDate: batch.manufacturingDate,
        expiryDate: batch.expiryDate,
        receivedDate: batch.receivedDate,
        daysUntilExpiry,
        expiryStatus: status,
      };
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async disposeBatch(batchId: string, reason?: string, notes?: string) {
    const batch = await this.prisma.inventoryBatch.findUnique({
      where: { id: batchId },
      include: { product: true },
    });

    if (!batch) {
      throw new NotFoundException('Không tìm thấy lô hàng');
    }

    if (batch.status !== 'active') {
      throw new BadRequestException('Lô hàng không ở trạng thái active');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update batch status
      await tx.inventoryBatch.update({
        where: { id: batchId },
        data: {
          status: 'disposed',
          notes: [notes, reason].filter(Boolean).join(' - ') || batch.notes,
        },
      });

      // Update inventory quantity
      await tx.inventory.update({
        where: { id: batch.inventoryId },
        data: {
          quantity: { decrement: batch.quantity },
          lastUpdated: new Date(),
        },
      });

      // Create history record
      await tx.inventoryHistory.create({
        data: {
          farmId: batch.farmId,
          warehouseId: batch.warehouseId,
          productId: batch.productId,
          transactionType: 'out',
          referenceType: 'disposal',
          referenceId: batch.id,
          quantityBefore: Number(batch.quantity),
          quantityChange: -Number(batch.quantity),
          quantityAfter: 0,
          unitCost: Number(batch.unitCost),
          totalCost: Number(batch.quantity) * Number(batch.unitCost),
          notes: `Hủy lô hàng hết hạn: ${batch.batchNumber || batch.id}. ${reason || ''}`,
        },
      });

      return { success: true, disposedQuantity: Number(batch.quantity) };
    });
  }

  async updateExpiredBatches(farmId: string) {
    const now = new Date();

    const result = await this.prisma.inventoryBatch.updateMany({
      where: {
        farmId,
        status: 'active',
        expiryDate: { lt: now },
      },
      data: {
        status: 'expired',
      },
    });

    return { updatedCount: result.count };
  }

  async getInventoryBatches(inventoryId: string, includeAll = false) {
    return this.prisma.inventoryBatch.findMany({
      where: {
        inventoryId,
        ...(includeAll ? {} : { 
          status: 'active',
          quantity: { gt: 0 },
        }),
      },
      include: {
        receiptItem: {
          include: {
            receipt: {
              select: {
                receiptCode: true,
                receiptDate: true,
                supplier: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // active first
        { expiryDate: 'asc' },
      ],
    });
  }
}