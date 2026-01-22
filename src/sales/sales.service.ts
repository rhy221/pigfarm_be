import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesDto } from './dto/create-sales.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { FinanceService } from '../finance/finance.service';
import { TransactionType } from '../finance/finance.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private financeService: FinanceService,
  ) {}

  private async generateTransactionCode(
    tx: any,
    type: TransactionType,
    date: Date,
  ): Promise<string> {
    const prefix = type === TransactionType.INCOME ? 'PT' : 'PC';
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await tx.transactions.count({
      where: {
        transaction_type: type,
        transaction_date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    return `${prefix}-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  async create(dto: CreateSalesDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          let finalCustomerId = dto.customer_id;
          if (!finalCustomerId && dto.customer_name) {
            const newCustomer = await tx.customers.create({
              data: {
                name: dto.customer_name,
                phone: dto.phone_number,
                address_house_number: dto.full_address,
                is_active: true,
              },
            });
            finalCustomerId = newCustomer.id;
          }

          const totalAmount = dto.details.reduce(
            (sum, item) =>
              sum +
              (Number(item.total_weight) || 0) * (Number(item.unit_price) || 0),
            0,
          );

          const shippingStatus = await tx.pig_shipping_statuses.findFirst({
            where: { name: { contains: 'Chuẩn bị xuất chuồng' } },
          });

          const soldStatus = await tx.pig_statuses.findFirst({
            where: { status_name: { contains: 'Xuất chuồng' } },
          });

          const receipt = await tx.pig_shippings.create({
            data: {
              receipt_code: dto.receipt_code,
              export_date: new Date(dto.export_date),
              customer_id: finalCustomerId || null,
              customer_name: dto.customer_name,
              phone_number: dto.phone_number,
              full_address: dto.full_address,
              total_amount: new Decimal(totalAmount),
              payment_status: shippingStatus?.id,
            },
          });

          for (const detail of dto.details) {
            const weight = Number(detail.total_weight) || 0;
            const unitPrice = Number(detail.unit_price) || 0;

            const shippingDetail = await tx.pig_shipping_details.create({
              data: {
                pig_shipping_id: receipt.id,
                pen_id: detail.pen_id,
                total_weight: weight,
                price_unit: new Decimal(unitPrice),
                amount: new Decimal(weight * unitPrice),
              },
            });

            if (detail.pig_ids?.length) {
              await tx.shipped_pig_items.createMany({
                data: detail.pig_ids.map((pigId) => ({
                  shipping_detail_id: shippingDetail.id,
                  pig_id: pigId,
                })),
              });

              await tx.pigs.updateMany({
                where: { id: { in: detail.pig_ids } },
                data: {
                  pig_status_id:
                    soldStatus?.id || '75687aab-a78e-4173-a9df-b018b66f82e5',
                  pen_id: null,
                },
              });
            }
          }
          // Tự động tạo phiếu thu khi xuất chuồng thành công
          try {
            // Lấy tài khoản tiền mặt mặc định
            const defaultAccount = await tx.cash_accounts.findFirst({
              where: { is_default: true },
            });

            // Lấy danh mục giao dịch cho bán hàng (thu tiền từ bán heo)
            const salesCategory = await tx.transaction_categories.findFirst({
              where: {
                type: TransactionType.INCOME,
                name: { contains: 'Bán' },
              },
            });

            if (defaultAccount) {
              const transactionCode = await this.generateTransactionCode(
                tx,
                TransactionType.INCOME,
                new Date(dto.export_date),
              );

              await tx.transactions.create({
                data: {
                  transaction_code: transactionCode,
                  cash_account_id: defaultAccount.id,
                  category_id: salesCategory?.id,
                  transaction_type: TransactionType.INCOME,
                  transaction_date: new Date(dto.export_date),
                  amount: new Decimal(totalAmount),
                  contact_type: 'customer',
                  contact_id: finalCustomerId,
                  contact_name: dto.customer_name,
                  reference_type: 'other',
                  reference_id: receipt.id,
                  description: `Thu tiền từ phiếu xuất chuồng ${dto.receipt_code}`,
                  notes: `Khách hàng: ${dto.customer_name} - SĐT: ${dto.phone_number || 'N/A'}`,
                  is_recorded: false, // Chưa ghi sổ, sẽ ghi khi khách thanh toán
                },
              });
            }
          } catch (financeError) {
            console.error('Lỗi khi tạo phiếu thu tự động:', financeError);
            // Không throw error để không ảnh hưởng đến việc tạo phiếu xuất
          }
          return receipt;
        },
        {
          timeout: 15000,
        },
      );
    } catch (error) {
      console.error('Lỗi khi lưu phiếu xuất:', error);
      throw new InternalServerErrorException(
        'Không thể lưu phiếu xuất: ' + error.message,
      );
    }
  }

  async updateStatus(
    id: string,
    data: { payment_status: string; details: any[] },
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const statusObj = await tx.pig_shipping_statuses.findFirst({
        where: { name: { contains: data.payment_status } },
      });

      let newTotalAmount = 0;

      for (const detail of data.details) {
        const currentDetail = await tx.pig_shipping_details.findUnique({
          where: { id: detail.id },
          select: { price_unit: true },
        });

        const weight = Number(detail.total_weight) || 0;
        const unitPrice = Number(currentDetail?.price_unit) || 0;
        const lineAmount = weight * unitPrice;

        newTotalAmount += lineAmount;

        await tx.pig_shipping_details.update({
          where: { id: detail.id },
          data: {
            total_weight: weight,
            amount: new Decimal(lineAmount),
          },
        });
      }

      await tx.pig_shippings.update({
        where: { id },
        data: {
          payment_status: statusObj?.id,
          total_amount: new Decimal(newTotalAmount),
        },
      });

      return { success: true, total: newTotalAmount };
    });
  }

  async findAll() {
    const data = await this.prisma.pig_shippings.findMany({
      include: {
        pig_shipping_statuses: {
          select: { name: true },
        },
        pig_shipping_details: {
          include: {
            pens: { select: { pen_name: true } },
          } as any,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const processed = data.map((item) => ({
      ...item,
      sdt: item.phone_number,
      diaChi: item.full_address,
      dot: item.receipt_code,
      khachHang: item.customer_name,
      ngayXuat: item.export_date,
      tinhTrangThanhToan: item.pig_shipping_statuses?.name || 'N/A',
      chuong: item.pig_shipping_details
        .map((d: any) => d.pens?.pen_name)
        .filter(Boolean)
        .join(', '),
    }));

    return JSON.parse(
      JSON.stringify(processed, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }

  async findOne(id: string) {
    const data = await this.prisma.pig_shippings.findUnique({
      where: { id },
      include: {
        pig_shipping_statuses: {
          select: { name: true },
        },
        pig_shipping_details: {
          include: {
            pens: { select: { pen_name: true } },
            shipped_pig_items: {
              include: { pigs: true },
            },
          } as any,
        },
      },
    });

    if (!data) return null;

    const processed = {
      ...data,
      sdt: data.phone_number,
      diaChi: data.full_address,
      dot: data.receipt_code,
      khachHang: data.customer_name,
      ngayXuat: data.export_date,
      tinhTrangThanhToan: data.pig_shipping_statuses?.name || 'N/A',
      details: data.pig_shipping_details.map((d: any, index: number) => ({
        stt: index + 1,
        id: d.id,
        chuong: d.pens?.pen_name || 'N/A',
        tongTrongLuong: Number(d.total_weight) || 0,
        donGia: Number(d.price_unit) || 0,
        thanhTien: Number(d.amount) || 0,
      })),
    };

    return JSON.parse(
      JSON.stringify(processed, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }

  async getNextReceiptCode() {
    const lastRecord = await this.prisma.pig_shippings.findFirst({
      where: { receipt_code: { startsWith: 'DXC-' } },
      orderBy: { receipt_code: 'desc' },
      select: { receipt_code: true },
    });

    if (!lastRecord || !lastRecord.receipt_code) {
      return 'DXC-0001';
    }

    const match = lastRecord.receipt_code.match(/\d+/);
    const lastNumber = match ? parseInt(match[0]) : 0;
    const nextNumber = lastNumber + 1;
    return `DXC-${nextNumber.toString().padStart(4, '0')}`;
  }
}
