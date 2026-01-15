import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesDto } from './dto/create-sales.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSalesDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const totalAmount = dto.details.reduce(
          (sum, item) => sum + (Number(item.total_weight) || 0) * (Number(item.unit_price) || 0),
          0,
        );

        const shippingStatus = await tx.pig_shipping_statuses.findFirst({
          where: { name: { contains: 'Chuẩn bị' } },
        });

        const soldStatus = await tx.pig_statuses.findFirst({
          where: { status_name: { contains: 'Bán' } }
        });

        const receipt = await tx.pig_shippings.create({
          data: {
            receipt_code: dto.receipt_code,
            export_date: new Date(dto.export_date),
            customer_id: dto.customer_id || null, 
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
                pig_status_id: soldStatus?.id || '75687aab-a78e-4173-a9df-b018b66f82e5', 
                pen_id: null,
              },
            });
          }
        }

        return receipt;
      }, {
        timeout: 10000  
      });
    } catch (error) {
      console.error("Lỗi khi lưu phiếu xuất:", error);
      throw new InternalServerErrorException("Không thể lưu phiếu xuất: " + error.message);
    }
  }

  async findAll() {
    return this.prisma.pig_shippings.findMany({
      include: {
        pig_shipping_details: {
          include: {
            pens: { select: { pen_name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.pig_shippings.findUnique({
      where: { id },
      include: {
        pig_shipping_details: {
          include: {
            pens: { select: { pen_name: true } },
            shipped_pig_items: {
              include: { pigs: true },
            },
          },
        },
      },
    });
  }

  async getNextReceiptCode() {
    const lastRecord = await this.prisma.pig_shippings.findFirst({
      where: { receipt_code: { startsWith: 'DXC-' } },
      orderBy: { receipt_code: 'desc' },
      select: { receipt_code: true }
    });

    if (!lastRecord || !lastRecord.receipt_code) {
      return 'DXC-0001';
    }

    const lastNumber = parseInt(lastRecord.receipt_code.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `DXC-${nextNumber.toString().padStart(4, '0')}`;
  }
}