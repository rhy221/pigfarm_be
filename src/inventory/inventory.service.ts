// =====================================================
// INVENTORY MODULE - SERVICE
// =====================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
import {NamingUtils} from '../lib/utils';
 import { Prisma, PrismaClient } from '../generated/prisma/client.js';
@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ============ HELPER METHODS ============
  private async generateDocumentCode(prefix: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    let count = 1;
    if (prefix === 'PN') {
      count = await this.prisma.stock_receipts.count({
        where: {
          receipt_date: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
        },
      }) + 1;
    } else if (prefix === 'PX') {
      count = await this.prisma.stock_issues.count({
        where: {
          issue_date: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
        },
      }) + 1;
    } else if (prefix === 'KK') {
      count = await this.prisma.inventory_checks.count({
        where: {
          check_date: {
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
      await this.prisma.warehouses.updateMany({
        where: { is_default: true },
        data: { is_default: false },
      });
    }
    return this.prisma.warehouses.create({
      data: NamingUtils.toSnakeCase(dto),
    });
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const warehouse = await this.prisma.warehouses.findUnique({ where: { id } });
    if (!warehouse) {
      throw new NotFoundException('Không tìm thấy kho');
    }
    // Nếu set là default, unset các kho khác
    if (dto.isDefault) {
      await this.prisma.warehouses.updateMany({
        where: { is_default: true, id: { not: id } },
        data: { is_default: false },
      });
    }
    return this.prisma.warehouses.update({
      where: { id },
      data: dto,
    });
  }

  async deleteWarehouse(id: string) {
    const warehouse = await this.prisma.warehouses.findUnique({ where: { id } });
    if (!warehouse) {
      throw new NotFoundException('Không tìm thấy kho');
    }
    return this.prisma.warehouses.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getWarehouses() {
    return this.prisma.warehouses.findMany({
      where: { is_active: true },
      include: {
        _count: {
          select: { inventory: true },
        },
      },
      orderBy: [
        { is_default: 'desc' }, // Default warehouse first
        { name: 'asc' },
      ],
    });
  }

  async getWarehouseById(id: string) {
    const warehouse = await this.prisma.warehouses.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            products: {
              include: { units: true, warehouse_categories: true },
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
    return this.prisma.warehouse_categories.create({ data: dto });
  }

  async updateWarehouseCategory(id: string, dto: UpdateWarehouseCategoryDto) {
    return this.prisma.warehouse_categories.update({ where: { id }, data: dto });
  }

  async getWarehouseCategories() {
    return this.prisma.warehouse_categories.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  // ============ UNIT METHODS ============
  async createUnit(dto: CreateUnitDto) {
    return this.prisma.units.create({ data: dto });
  }

  async updateUnit(id: string, dto: UpdateUnitDto) {
    return this.prisma.units.update({ where: { id }, data: dto });
  }

  async getUnits() {
    return this.prisma.units.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  // ============ PRODUCT METHODS ============
  async createProduct(dto: CreateProductDto) {
    if (!dto.code) {
      const count = await this.prisma.products.count();
      dto.code = `SP${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.products.create({
      data: NamingUtils.toSnakeCase(dto),
      include: { warehouse_categories: true, units: true },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    return this.prisma.products.update({
      where: { id },
      data: NamingUtils.toSnakeCase(dto),
      include: { warehouse_categories: true, units: true },
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.products.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getProducts(categoryId?: string, search?: string) {
    const where: Prisma.productsWhereInput = {
      
      is_active: true,
    };
    if (categoryId) where.category_id = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.products.findMany({
      where,
      include: { warehouse_categories: true, units: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.products.findUnique({
      where: { id },
      include: { warehouse_categories: true, units: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  // ============ SUPPLIER METHODS ============
  async createSupplier(dto: CreateSupplierDto) {
    if (!dto.code) {
      const count = await this.prisma.suppliers.count();
      dto.code = `NCC${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.suppliers.create({ data: NamingUtils.toSnakeCase(dto) });
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    return this.prisma.suppliers.update({ where: { id }, data: NamingUtils.toSnakeCase(dto) });
  }

  async deleteSupplier(id: string) {
    return this.prisma.suppliers.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getSuppliers( search?: string) {
    const where: Prisma.suppliersWhereInput = { is_active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    return this.prisma.suppliers.findMany({ where, orderBy: { name: 'asc' } });
  }

  async getSupplierById(id: string) {
    const supplier = await this.prisma.suppliers.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    return supplier;
  }

  async getSupplierDebtHistory(supplierId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.supplier_debts.findMany({
        where: { supplier_id: supplierId },
        orderBy: { transaction_date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supplier_debts.count({ where: { supplier_id: supplierId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ============ INVENTORY METHODS ============
  async getInventory(query: InventoryQueryDto) {
    const {warehouseId, categoryId, search, stockStatus, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.inventoryWhereInput = {};
    if (warehouseId) where.warehouse_id = warehouseId;
    if (categoryId) where.products = { category_id: categoryId };
    if (search) {
      where.products = {
        ...where.products as object,
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
          warehouses: true,
          products: { include: { warehouse_categories: true, units: true } },
        },
        skip,
        take: limit,
        orderBy: { products: { name: 'asc' } },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    // Filter by stock status if needed
    let filteredData = data;
    if (stockStatus && stockStatus !== 'all') {
      filteredData = data.filter((item) => {
        const qty = Number(item.quantity);
        const minQty = Number(item.products.min_quantity);
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

  async getInventorySummary() {
    const inventory = await this.prisma.inventory.findMany({
      
      include: {
        products: { include: { warehouse_categories: true } },
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
      const cost = Number(item.avg_cost);
      const minQty = Number(item.products.min_quantity);
      const value = qty * cost;

      summary.totalValue += value;

      if (qty <= 0) summary.outOfStock++;
      else if (qty <= minQty) summary.lowStock++;
      else summary.inStock++;

      const categoryName = item.products.warehouse_categories?.name || 'Chưa phân loại';
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
    const receiptCode = await this.generateDocumentCode( 'PN', receiptDate);

    // Calculate totals
    let totalAmount = 0;
    const itemsData = dto.items.map((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const discountAmt = item.discountAmount || (itemTotal * (item.discountPercent || 0)) / 100;
      const afterDiscount = itemTotal - discountAmt;
      const taxAmt = item.taxAmount || (afterDiscount * (item.taxPercent || 0)) / 100;
      const finalTotal = afterDiscount + taxAmt;
      totalAmount += finalTotal;

      return NamingUtils.toSnakeCase( {
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
      });
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

    return this.prisma.stock_receipts.create({
      data: {

        warehouse_id: dto.warehouseId,
        supplier_id: dto.supplierId,
        receipt_code: receiptCode,
        receipt_date: receiptDate,
        receipt_type: dto.receiptType || 'purchase',
        total_amount: totalAmount,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        shipping_fee: shippingFee,
        final_amount: finalAmount,
        paid_amount: paidAmount,
        debt_amount: debtAmount,
        payment_status: paymentStatus,
        notes: dto.notes,
        invoice_number: dto.invoiceNumber,
        invoice_date: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
        created_by: createdById,
        status: 'draft',
        stock_receipt_items: { create: itemsData },
      },
      include: {
        stock_receipt_items: { include: { products: { include: { units: true } } } },
        suppliers: true,
        warehouses: true,
      },
    });
  }

  async updateStockReceipt(id: string, dto: UpdateStockReceiptDto) {
    const receipt = await this.prisma.stock_receipts.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (receipt.status === 'confirmed') {
      throw new BadRequestException('Không thể sửa phiếu đã xác nhận');
    }

    // Delete old items and recreate
    if (dto.items) {
      await this.prisma.stock_receipt_items.deleteMany({ where: { receipt_id: id } });

      let totalAmount = 0;
      const itemsData = dto.items.map((item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const discountAmt = item.discountAmount || (itemTotal * (item.discountPercent || 0)) / 100;
        const afterDiscount = itemTotal - discountAmt;
        const taxAmt = item.taxAmount || (afterDiscount * (item.taxPercent || 0)) / 100;
        const finalTotal = afterDiscount + taxAmt;
        totalAmount += finalTotal;

        return NamingUtils.toSnakeCase( {
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
        });
      });

      await this.prisma.stock_receipt_items.createMany({ data: itemsData });

      const discountAmount = dto.discountAmount ?? Number(receipt.discount_amount);
      const taxAmount = dto.taxAmount ?? Number(receipt.tax_amount);
      const shippingFee = dto.shippingFee ?? Number(receipt.shipping_fee);
      const finalAmount = totalAmount - discountAmount + taxAmount + shippingFee;
      const paidAmount = dto.paidAmount ?? Number(receipt.paid_amount);
      const debtAmount = finalAmount - paidAmount;

      let paymentStatus = 'unpaid';
      if (paidAmount >= finalAmount) paymentStatus = 'paid';
      else if (paidAmount > 0) paymentStatus = 'partial';

      return this.prisma.stock_receipts.update({
        where: { id },
        data: {
          warehouse_id: dto.warehouseId,
          supplier_id: dto.supplierId,
          receipt_date: dto.receiptDate ? new Date(dto.receiptDate) : undefined,
          receipt_type: dto.receiptType,
          total_amount: totalAmount,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          shipping_fee: shippingFee,
          final_amount: finalAmount,
          paid_amount: paidAmount,
          debt_amount: debtAmount,
          payment_status: paymentStatus,
          notes: dto.notes,
          invoice_number: dto.invoiceNumber,
          invoice_date: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
        },
        include: {
          stock_receipt_items: { include: { products: { include: { units: true } } } },
          suppliers: true,
          warehouses: true,
        },
      });
    }

    return this.prisma.stock_receipts.update({
      where: { id },
      data: {
        notes: dto.notes,
        invoice_number: dto.invoiceNumber,
        invoice_date: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
      },
      include: {
        stock_receipt_items: { include: { products: { include: { units: true } } } },
        suppliers: true,
        warehouses: true,
      },
    });
  }

  async confirmStockReceipt(id: string, approvedById?: string) {
    const receipt = await this.prisma.stock_receipts.findUnique({
      where: { id },
      include: { stock_receipt_items: true },
    });

    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (receipt.status === 'confirmed') {
      throw new BadRequestException('Phiếu đã được xác nhận');
    }

    // Update inventory using transaction
    await this.prisma.$transaction(async (tx) => {
      for (const item of receipt.stock_receipt_items) {
        const inventory = await tx.inventory.findUnique({
          where: {
            warehouse_id_product_id: {
              warehouse_id: receipt.warehouse_id,
              product_id: item.product_id,
            },
          },
        });

        const currentQty = inventory ? Number(inventory.quantity) : 0;
        const currentCost = inventory ? Number(inventory.avg_cost) : 0;
        const newQty = currentQty + Number(item.quantity);
        const newCost = newQty > 0
          ? ((currentQty * currentCost) + (Number(item.quantity) * Number(item.unit_price))) / newQty
          : Number(item.unit_price);
        await tx.inventory.upsert({
          where: {
            warehouse_id_product_id: {
              warehouse_id: receipt.warehouse_id,
              product_id: item.product_id,
            },
          },
          create: {
       
            warehouse_id: receipt.warehouse_id,
            product_id: item.product_id,
            quantity: Number(item.quantity),
            avg_cost: Number(item.unit_price),
          },
          update: {
            quantity: newQty,
            avg_cost: newCost,
            last_updated: new Date(),
          },
        });

        // Create inventory history
        await tx.inventory_history.create({
          data: {
            warehouse_id: receipt.warehouse_id,
            product_id: item.product_id,
            transaction_type: 'in',
            reference_type: 'receipt',
            reference_id: receipt.id,
            quantity_before: currentQty,
            quantity_change: Number(item.quantity),
            quantity_after: newQty,
            unit_cost: Number(item.unit_price),
            total_cost: Number(item.total_amount),
            created_by: approvedById,
          },
        });
      }

      // Update supplier debt if applicable
      if (receipt.supplier_id && Number(receipt.debt_amount) > 0) {
        const supplier = await tx.suppliers.findUnique({
          where: { id: receipt.supplier_id },
        });
        const balanceBefore = supplier ? Number(supplier.total_debt) : 0;
        const balanceAfter = balanceBefore + Number(receipt.debt_amount);

        await tx.suppliers.update({
          where: { id: receipt.supplier_id },
          data: { total_debt: balanceAfter },
        });

        await tx.supplier_debts.create({
          data: {
            supplier_id: receipt.supplier_id,
            reference_type: 'stock_receipt',
            reference_id: receipt.id,
            transaction_date: receipt.receipt_date,
            debt_amount: Number(receipt.debt_amount),
            payment_amount: 0,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
          },
        });
      }

      // Update receipt status
      await tx.stock_receipts.update({
        where: { id },
        data: {
          status: 'confirmed',
          approved_by: approvedById,
        },
      });
    });

    return this.getStockReceiptById(id);
  }

  async cancelStockReceipt(id: string) {
    const receipt = await this.prisma.stock_receipts.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (receipt.status === 'confirmed') {
      throw new BadRequestException('Không thể hủy phiếu đã xác nhận');
    }

    return this.prisma.stock_receipts.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async getStockReceipts(query: StockReceiptQueryDto) {
    const { warehouseId, supplierId, fromDate, toDate, status, paymentStatus, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.stock_receiptsWhereInput = {};
    if (warehouseId) where.warehouse_id = warehouseId;
    if (supplierId) where.supplier_id = supplierId;
    if (status) where.status = status;
    if (paymentStatus) where.payment_status = paymentStatus;
    if (fromDate || toDate) {
      where.receipt_date = {};
      if (fromDate) where.receipt_date.gte = new Date(fromDate);
      if (toDate) where.receipt_date.lte = new Date(toDate);
    }
    if (search) {
      where.OR = [
        { receipt_code: { contains: search, mode: 'insensitive' } },
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { suppliers: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stock_receipts.findMany({
        where,
        include: {
          suppliers: true,
          warehouses: true,
          users_stock_receipts_created_byTousers: { select: { id: true, full_name: true } },
        },
        skip,
        take: limit,
        orderBy: { receipt_date: 'desc' },
      }),
      this.prisma.stock_receipts.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStockReceiptById(id: string) {
    const receipt = await this.prisma.stock_receipts.findUnique({
      where: { id },
      include: {
        stock_receipt_items: { include: { products: { include: { units: true, warehouse_categories: true } } } },
        suppliers: true,
        warehouses: true,
        users_stock_receipts_created_byTousers: { select: { id: true, full_name: true } },
        users_stock_receipts_approved_byTousers: { select: { id: true, full_name: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    return receipt;
  }

  // ============ STOCK ISSUE METHODS ============
  async createStockIssue(dto: CreateStockIssueDto, createdById?: string) {
    const issueDate = new Date(dto.issueDate);
    const issueCode = await this.generateDocumentCode('PX', issueDate);

    // Validate inventory and get unit costs
    const itemsData: any = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      const inventory = await this.prisma.inventory.findUnique({
        where: {
          warehouse_id_product_id: {
            warehouse_id: dto.warehouseId,
            product_id: item.productId,
          },
        },
      });

      if (!inventory || Number(inventory.quantity) < item.quantity) {
        const product = await this.prisma.products.findUnique({ where: { id: item.productId } });
        throw new BadRequestException(
          `Sản phẩm "${product?.name || item.productId}" không đủ số lượng trong kho`
        );
      }

      const unitCost = Number(inventory.avg_cost);
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

    return this.prisma.stock_issues.create({
      data: {
        warehouse_id: dto.warehouseId,
        issue_code: issueCode,
        issue_date: issueDate,
        issue_type: dto.issueType || 'usage',
        purpose: dto.purpose,
        total_amount: totalAmount,
        notes: dto.notes,
        pig_batch_id: dto.pigBatchId,
        created_by: createdById,
        status: 'draft',
        stock_issue_items: { create: itemsData },
      },
      include: {
        stock_issue_items: { include: { products: { include: { units: true } } } },
        warehouses: true,
      },
    });
  }

  async confirmStockIssue(id: string, approvedById?: string) {
    const issue = await this.prisma.stock_issues.findUnique({
      where: { id },
      include: { stock_issue_items: true },
    });

    if (!issue) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    if (issue.status === 'confirmed') {
      throw new BadRequestException('Phiếu đã được xác nhận');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of issue.stock_issue_items) {
        const inventory = await tx.inventory.findUnique({
          where: {
            warehouse_id_product_id: {
              warehouse_id: issue.warehouse_id,
              product_id: item.product_id,
            },
          },
        });

        if (!inventory || Number(inventory.quantity) < Number(item.quantity)) {
          const product = await tx.products.findUnique({ where: { id: item.product_id } });
          throw new BadRequestException(
            `Sản phẩm "${product?.name}" không đủ số lượng trong kho`
          );
        }

        const currentQty = Number(inventory.quantity);
        const newQty = currentQty - Number(item.quantity);

        await tx.inventory.update({
          where: {
            warehouse_id_product_id: {
              warehouse_id: issue.warehouse_id,
              product_id: item.product_id,
            },
          },
          data: {
            quantity: newQty,
            last_updated: new Date(),
          },
        });

        await tx.inventory_history.create({
          data: {
            warehouse_id: issue.warehouse_id,
            product_id: item.product_id,
            transaction_type: 'out',
            reference_type: 'issue',
            reference_id: issue.id,
            quantity_before: currentQty,
            quantity_change: Number(item.quantity),
            quantity_after: newQty,
            unit_cost: Number(item.unit_cost),
            total_cost: Number(item.total_amount),
            created_by: approvedById,
          },
        });
      }

      await tx.stock_issues.update({
        where: { id },
        data: {
          status: 'confirmed',
          approved_by: approvedById,
        },
      });
    });

    return this.getStockIssueById(id);
  }

  async cancelStockIssue(id: string) {
    const issue = await this.prisma.stock_issues.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    if (issue.status === 'confirmed') {
      throw new BadRequestException('Không thể hủy phiếu đã xác nhận');
    }
    return this.prisma.stock_issues.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async getStockIssues(query: StockIssueQueryDto) {
    const { warehouseId, fromDate, toDate, status, issueType, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.stock_issuesWhereInput = {};
    if (warehouseId) where.warehouse_id = warehouseId;
    if (status) where.status = status;
    if (issueType) where.issue_type = issueType;
    if (fromDate || toDate) {
      where.issue_date = {};
      if (fromDate) where.issue_date.gte = new Date(fromDate);
      if (toDate) where.issue_date.lte = new Date(toDate);
    }
    if (search) {
      where.OR = [
        { issue_code: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stock_issues.findMany({
        where,
        include: {
          warehouses: true,
          users_stock_issues_created_byTousers: { select: { id: true, full_name: true } },
        },
        skip,
        take: limit,
        orderBy: { issue_date: 'desc' },
      }),
      this.prisma.stock_issues.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStockIssueById(id: string) {
    const issue = await this.prisma.stock_issues.findUnique({
      where: { id },
      include: {
        stock_issue_items: { include: { products: { include: { units: true, warehouse_categories: true } } } },
        warehouses: true,
        users_stock_issues_created_byTousers: { select: { id: true, full_name: true } },
        users_stock_issues_approved_byTousers: { select: { id: true, full_name: true } },
      },
    });
    if (!issue) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    return issue;
  }

  // ============ INVENTORY HISTORY METHODS ============
  async getInventoryHistory(query: InventoryHistoryQueryDto) {
    const { warehouseId, productId, fromDate, toDate, transactionType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.inventory_historyWhereInput = {};
  if (warehouseId) where.warehouse_id = warehouseId;
    if (productId) where.product_id = productId;
    if (transactionType) where.transaction_type = transactionType;
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at.gte = new Date(fromDate);
      if (toDate) where.created_at.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.inventory_history.findMany({
        where,
        include: {
          products: { include: { units: true } },
          warehouses: true,
          users: { select: { id: true, full_name: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.inventory_history.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ============ INVENTORY CHECK METHODS ============
  async createInventoryCheck(dto: CreateInventoryCheckDto, createdById?: string) {
    const checkDate = new Date(dto.checkDate);
    const checkCode = await this.generateDocumentCode( 'KK', checkDate);

    const itemsData: any = [];
    for (const item of dto.items) {
      const inventory = await this.prisma.inventory.findUnique({
        where: {
          warehouse_id_product_id: {
            warehouse_id: dto.warehouseId,
            product_id: item.productId,
          },
        },
      });

      const systemQuantity = inventory ? Number(inventory.quantity) : 0;
      const unitCost = inventory ? Number(inventory.avg_cost) : 0;
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

    return this.prisma.inventory_checks.create({
      data: {
        warehouse_id: dto.warehouseId,
        check_code: checkCode,
        check_date: checkDate,
        notes: dto.notes,
        created_by: createdById,
        status: 'draft',
        inventory_check_items: { create: itemsData },
      },
      include: {
        inventory_check_items: { include: { products: { include: { units: true } } } },
        warehouses: true,
      },
    });
  }

  async confirmInventoryCheck(id: string, approvedById?: string) {
    const check = await this.prisma.inventory_checks.findUnique({
      where: { id },
      include: { inventory_check_items: true },
    });

    if (!check) throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    if (check.status === 'confirmed') {
      throw new BadRequestException('Phiếu đã được xác nhận');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of check.inventory_check_items) {
        if (Number(item.difference) !== 0) {
          const inventory = await tx.inventory.findUnique({
            where: {
              warehouse_id_product_id: {
                warehouse_id: check.warehouse_id,
                product_id: item.product_id,
              },
            },
          });

          const currentQty = inventory ? Number(inventory.quantity) : 0;

          await tx.inventory.upsert({
            where: {
              warehouse_id_product_id: {
                warehouse_id: check.warehouse_id,
                product_id: item.product_id,
              },
            },
            create: {
              warehouse_id: check.warehouse_id,
              product_id: item.product_id,
              quantity: Number(item.actual_quantity),
              avg_cost: Number(item.unit_cost),
            },
            update: {
              quantity: Number(item.actual_quantity),
              last_updated: new Date(),
            },
          });

          await tx.inventory_history.create({
            data: {
              warehouse_id: check.warehouse_id,
              product_id: item.product_id,
              transaction_type: 'adjustment',
              reference_type: 'check',
              reference_id: check.id,
              quantity_before: currentQty,
              quantity_change: Number(item.difference),
              quantity_after: Number(item.actual_quantity),
              unit_cost: Number(item.unit_cost),
              total_cost: Math.abs(Number(item.difference_value)),
              notes: `Kiểm kê điều chỉnh: ${item.notes || ''}`,
              created_by: approvedById,
            },
          });
        }
      }

      await tx.inventory_checks.update({
        where: { id },
        data: {
          status: 'confirmed',
          approved_by: approvedById,
        },
      });
    });

    return this.prisma.inventory_checks.findUnique({
      where: { id },
      include: {
        inventory_check_items: { include: { products: { include: { units: true } } } },
        warehouses: true,
      },
    });
  }

  // ============ EXPIRY ALERT METHODS ============

  async getExpirySummary() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const batches = await this.prisma.inventory_batches.findMany({
      where: {
        status: 'active',
        quantity: { gt: 0 },
        expiry_date: { not: null },
      },
      select: {
        quantity: true,
        unit_cost: true,
        expiry_date: true,
      },
    });

    let expiredCount = 0, criticalCount = 0, warningCount = 0, noticeCount = 0;
    let expiredValue = 0, criticalValue = 0, warningValue = 0;

    batches.forEach(batch => {
      const value = Number(batch.quantity) * Number(batch.unit_cost);
      const expiryDate = batch.expiry_date!;

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
    expiryStatus?: string;
    warehouseId?: string;
    categoryId?: string;
    productId?: string;
    page?: number;
    limit?: number;
  }) {
    const { expiryStatus, warehouseId, categoryId, productId, page = 1, limit = 20 } = query;
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
      this.prisma.inventory_batches.findMany({
        where,
        include: {
          warehouses: true,
          products: {
            include: {
              units: true,
              warehouse_categories: true,
            },
          },
        },
        orderBy: [
          { expiry_date: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.inventory_batches.count({ where }),
    ]);

    // Calculate expiry status for each batch
    const data = batches.map(batch => {
      const daysUntilExpiry = batch.expiry_date
        ? Math.ceil((batch.expiry_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      let status = 'no_expiry';
      if (batch.expiry_date) {
        if (batch.expiry_date < now) status = 'expired';
        else if (batch.expiry_date <= sevenDaysLater) status = 'critical';
        else if (batch.expiry_date <= thirtyDaysLater) status = 'warning';
        else if (batch.expiry_date <= ninetyDaysLater) status = 'notice';
        else status = 'good';
      }

      return {
        batchId: batch.id,
        warehouseId: batch.warehouse_id,
        warehouseName: batch.warehouses.name,
        productId: batch.product_id,
        productCode: batch.products.code,
        productName: batch.products.name,
        categoryName: batch.products.warehouse_categories?.name,
        categoryType: batch.products.warehouse_categories?.type,
        unitName: batch.products.units?.name,
        batchNumber: batch.batch_number,
        quantity: Number(batch.quantity),
        unitCost: Number(batch.unit_cost),
        totalValue: Number(batch.quantity) * Number(batch.unit_cost),
        manufacturingDate: batch.manufacturing_date,
        expiryDate: batch.expiry_date,
        receivedDate: batch.received_date,
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
    const batch = await this.prisma.inventory_batches.findUnique({
      where: { id: batchId },
      include: { products: true },
    });

    if (!batch) {
      throw new NotFoundException('Không tìm thấy lô hàng');
    }

    if (batch.status !== 'active') {
      throw new BadRequestException('Lô hàng không ở trạng thái active');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update batch status
      await tx.inventory_batches.update({
        where: { id: batchId },
        data: {
          status: 'disposed',
          notes: [notes, reason].filter(Boolean).join(' - ') || batch.notes,
        },
      });

      // Update inventory quantity
      await tx.inventory.update({
        where: { id: batch.inventory_id },
        data: {
          quantity: { decrement: batch.quantity || 0 },
          last_updated: new Date(),
        },
      });

      // Create history record
      await tx.inventory_history.create({
        data: {
          warehouse_id: batch.warehouse_id,
          product_id: batch.product_id,
          transaction_type: 'out',
          reference_type: 'disposal',
          reference_id: batch.id,
          quantity_before: Number(batch.quantity),
          quantity_change: -Number(batch.quantity),
          quantity_after: 0,
          unit_cost: Number(batch.unit_cost),
          total_cost: Number(batch.quantity) * Number(batch.unit_cost),
          notes: `Hủy lô hàng hết hạn: ${batch.batch_number || batch.id}. ${reason || ''}`,
        },
      });

      return { success: true, disposedQuantity: Number(batch.quantity) };
    });
  }

  async updateExpiredBatches() {
    const now = new Date();

    const result = await this.prisma.inventory_batches.updateMany({
      where: {
        status: 'active',
        expiry_date: { lt: now },
      },
      data: {
        status: 'expired',
      },
    });

    return { updatedCount: result.count };
  }

  async getInventoryBatches(inventoryId: string, includeAll = false) {
    return this.prisma.inventory_batches.findMany({
      where: {
        inventory_id: inventoryId,
        ...(includeAll ? {} : { 
          status: 'active',
          quantity: { gt: 0 },
        }),
      },
      include: {
        stock_receipt_items: {
          include: {
            stock_receipts: {
              select: {
                receipt_code: true,
                receipt_date: true,
                suppliers: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // active first
        { expiry_date: 'asc' },
      ],
    });
  }
}