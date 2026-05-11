import type { Prisma } from '@prisma/client';

import { FULFILLMENT_MODE, FULFILLMENT_STATUS, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, toSharedEnum } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

export interface OrderItemInput {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  specId: string;
  specLabel: string;
  lineTotal: number;
}

export interface CreateOrderInput {
  id: string;
  openid: string;
  idempotencyKey: string;
  paymentMethod: 'wechat' | 'balance';
  fulfillmentMode: 'delivery' | 'pickup' | 'express';
  itemsSubtotal: number;
  deliveryFee: number;
  payableTotal: number;
  snapshot: unknown;
  items: OrderItemInput[];
}

export interface OrderRecord {
  id: string;
  openid: string;
  status: 'pending_payment' | 'payment_processing' | 'paid' | 'payment_failed' | 'cancelled';
  idempotencyKey?: string;
  paymentMethod: 'wechat' | 'balance';
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  fulfillmentMode: 'delivery' | 'pickup' | 'express';
  fulfillmentStatus?: 'pending' | 'in_production' | 'out_for_delivery' | 'ready_for_pickup' | 'ready_to_ship' | 'completed' | 'cancelled';
  pricing: {
    itemsSubtotal: number;
    deliveryFee: number;
    payableTotal: number;
  };
  snapshot: unknown;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  cancelledAt?: string;
}

interface OrderRow {
  id: string;
  openid: string;
  status: string;
  idempotencyKey: string | null;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentMode: string;
  fulfillmentStatus: string | null;
  itemsSubtotal: { toNumber(): number };
  deliveryFee: { toNumber(): number };
  payableTotal: { toNumber(): number };
  snapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  cancelledAt: Date | null;
}

export function mapOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    openid: row.openid,
    status: toSharedEnum(row.status, ORDER_STATUS),
    idempotencyKey: row.idempotencyKey ?? undefined,
    paymentMethod: toSharedEnum(row.paymentMethod, PAYMENT_METHOD),
    paymentStatus: toSharedEnum(row.paymentStatus, PAYMENT_STATUS),
    fulfillmentMode: toSharedEnum(row.fulfillmentMode, FULFILLMENT_MODE),
    fulfillmentStatus: row.fulfillmentStatus ? toSharedEnum(row.fulfillmentStatus, FULFILLMENT_STATUS) : undefined,
    pricing: {
      itemsSubtotal: row.itemsSubtotal.toNumber(),
      deliveryFee: row.deliveryFee.toNumber(),
      payableTotal: row.payableTotal.toNumber()
    },
    snapshot: row.snapshot,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    paidAt: row.paidAt?.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString()
  };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function createOrderRepository(client: DbClient = getPrismaClient()) {
  return {
    async getById(orderId: string): Promise<OrderRecord | null> {
      const order = await client.order.findUnique({ where: { id: orderId } });
      return order ? mapOrder(order) : null;
    },

    async getByOpenidAndIdempotencyKey(openid: string, idempotencyKey: string): Promise<OrderRecord | null> {
      const order = await client.order.findUnique({
        where: {
          openid_idempotencyKey: { openid, idempotencyKey }
        }
      });
      return order ? mapOrder(order) : null;
    },

    async listByOpenid(openid: string): Promise<OrderRecord[]> {
      const orders = await client.order.findMany({
        where: { openid },
        orderBy: { createdAt: 'desc' }
      });
      return orders.map(mapOrder);
    },

    async listAll(): Promise<OrderRecord[]> {
      const orders = await client.order.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return orders.map(mapOrder);
    },

    async createPending(input: CreateOrderInput): Promise<OrderRecord> {
      const existing = await this.getByOpenidAndIdempotencyKey(input.openid, input.idempotencyKey);
      if (existing) {
        return existing;
      }

      const order = await client.order.create({
        data: {
          id: input.id,
          openid: input.openid,
          idempotencyKey: input.idempotencyKey,
          status: ORDER_STATUS.pending_payment,
          paymentMethod: PAYMENT_METHOD[input.paymentMethod],
          paymentStatus: PAYMENT_STATUS.pending,
          fulfillmentMode: FULFILLMENT_MODE[input.fulfillmentMode],
          fulfillmentStatus: FULFILLMENT_STATUS.pending,
          itemsSubtotal: input.itemsSubtotal,
          deliveryFee: input.deliveryFee,
          payableTotal: input.payableTotal,
          snapshot: asJson(input.snapshot),
          items: {
            create: input.items.map((item) => ({
              product: {
                connect: {
                  id: item.productId
                }
              },
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              specId: item.specId,
              specLabel: item.specLabel,
              lineTotal: item.lineTotal,
              snapshot: asJson(item)
            }))
          }
        }
      });
      return mapOrder(order);
    },

    async markPaymentProcessing(orderId: string): Promise<OrderRecord> {
      const order = await client.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.payment_processing,
          paymentStatus: PAYMENT_STATUS.processing
        }
      });
      return mapOrder(order);
    },

    async updateStatus(
      orderId: string,
      input: {
        status?: OrderRecord['status'];
        paymentStatus?: OrderRecord['paymentStatus'];
        fulfillmentStatus?: NonNullable<OrderRecord['fulfillmentStatus']>;
        paidAt?: Date;
        cancelledAt?: Date;
        merchantOverride?: unknown;
      }
    ): Promise<OrderRecord> {
      const order = await client.order.update({
        where: { id: orderId },
        data: {
          status: input.status ? ORDER_STATUS[input.status] : undefined,
          paymentStatus: input.paymentStatus ? PAYMENT_STATUS[input.paymentStatus] : undefined,
          fulfillmentStatus: input.fulfillmentStatus ? FULFILLMENT_STATUS[input.fulfillmentStatus] : undefined,
          paidAt: input.paidAt,
          cancelledAt: input.cancelledAt,
          merchantOverride: input.merchantOverride as Prisma.InputJsonValue | undefined
        }
      });
      return mapOrder(order);
    }
  };
}
