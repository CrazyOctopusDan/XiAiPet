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
  selectedGiftIds: string[];
}

export interface MerchantOrderListFilters {
  scope?: 'active' | 'history';
  fulfillmentMode?: 'delivery' | 'pickup' | 'express';
  keyword?: string;
}

export type CustomerOrderStatusGroup = 'all' | 'pending' | 'active' | 'completed';

export interface CustomerOrderListFilters {
  statusGroup?: CustomerOrderStatusGroup;
  limit?: number;
  cursor?: string;
}

export interface CustomerOrderPage {
  orders: OrderRecord[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

const ACTIVE_FULFILLMENT_STATUSES = [
  FULFILLMENT_STATUS.in_production,
  FULFILLMENT_STATUS.out_for_delivery,
  FULFILLMENT_STATUS.ready_for_pickup,
  FULFILLMENT_STATUS.ready_to_ship
];

export interface OrderRecord {
  id: string;
  openid: string;
  status: 'pending_payment' | 'payment_processing' | 'paid' | 'payment_failed' | 'cancelled';
  idempotencyKey?: string;
  paymentMethod: 'wechat' | 'balance';
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  fulfillmentMode: 'delivery' | 'pickup' | 'express';
  fulfillmentStatus?: 'pending' | 'in_production' | 'out_for_delivery' | 'ready_for_pickup' | 'ready_to_ship' | 'completed' | 'cancelled';
  fulfillmentState?: {
    mode: OrderRecord['fulfillmentMode'];
    status: NonNullable<OrderRecord['fulfillmentStatus']>;
    updatedAt: string;
  };
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

export interface OrderStatusEventRecord {
  id: string;
  type: 'created' | 'status_changed';
  fromOrderStatus?: OrderRecord['status'];
  toOrderStatus?: OrderRecord['status'];
  fromPaymentStatus?: OrderRecord['paymentStatus'];
  toPaymentStatus?: OrderRecord['paymentStatus'];
  fromFulfillmentStatus?: NonNullable<OrderRecord['fulfillmentStatus']>;
  toFulfillmentStatus?: NonNullable<OrderRecord['fulfillmentStatus']>;
  actorType: 'customer' | 'merchant' | 'system';
  actorOpenid?: string;
  actorName?: string;
  note?: string;
  occurredAt: string;
}

export interface OrderStatusEventInput {
  type: OrderStatusEventRecord['type'];
  fromOrderStatus?: OrderRecord['status'];
  toOrderStatus?: OrderRecord['status'];
  fromPaymentStatus?: OrderRecord['paymentStatus'];
  toPaymentStatus?: OrderRecord['paymentStatus'];
  fromFulfillmentStatus?: NonNullable<OrderRecord['fulfillmentStatus']>;
  toFulfillmentStatus?: NonNullable<OrderRecord['fulfillmentStatus']>;
  actorType: OrderStatusEventRecord['actorType'];
  actorOpenid?: string;
  actorName?: string;
  note?: string;
  occurredAt?: Date;
}

interface OrderStatusEventRow {
  id: string;
  type: 'CREATED' | 'STATUS_CHANGED';
  fromOrderStatus: string | null;
  toOrderStatus: string | null;
  fromPaymentStatus: string | null;
  toPaymentStatus: string | null;
  fromFulfillmentStatus: string | null;
  toFulfillmentStatus: string | null;
  actorType: string;
  actorOpenid: string | null;
  actorName: string | null;
  note: string | null;
  occurredAt: Date;
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
  const fulfillmentMode = toSharedEnum(row.fulfillmentMode, FULFILLMENT_MODE);
  const fulfillmentStatus = row.fulfillmentStatus ? toSharedEnum(row.fulfillmentStatus, FULFILLMENT_STATUS) : undefined;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    openid: row.openid,
    status: toSharedEnum(row.status, ORDER_STATUS),
    idempotencyKey: row.idempotencyKey ?? undefined,
    paymentMethod: toSharedEnum(row.paymentMethod, PAYMENT_METHOD),
    paymentStatus: toSharedEnum(row.paymentStatus, PAYMENT_STATUS),
    fulfillmentMode,
    fulfillmentStatus,
    fulfillmentState: fulfillmentStatus
      ? {
          mode: fulfillmentMode,
          status: fulfillmentStatus,
          updatedAt
        }
      : undefined,
    pricing: {
      itemsSubtotal: row.itemsSubtotal.toNumber(),
      deliveryFee: row.deliveryFee.toNumber(),
      payableTotal: row.payableTotal.toNumber()
    },
    snapshot: row.snapshot,
    createdAt: row.createdAt.toISOString(),
    updatedAt,
    paidAt: row.paidAt?.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString()
  };
}

function mapOrderStatusEvent(row: OrderStatusEventRow): OrderStatusEventRecord {
  return {
    id: row.id,
    type: row.type === 'CREATED' ? 'created' : 'status_changed',
    fromOrderStatus: row.fromOrderStatus ? toSharedEnum(row.fromOrderStatus, ORDER_STATUS) : undefined,
    toOrderStatus: row.toOrderStatus ? toSharedEnum(row.toOrderStatus, ORDER_STATUS) : undefined,
    fromPaymentStatus: row.fromPaymentStatus ? toSharedEnum(row.fromPaymentStatus, PAYMENT_STATUS) : undefined,
    toPaymentStatus: row.toPaymentStatus ? toSharedEnum(row.toPaymentStatus, PAYMENT_STATUS) : undefined,
    fromFulfillmentStatus: row.fromFulfillmentStatus
      ? toSharedEnum(row.fromFulfillmentStatus, FULFILLMENT_STATUS)
      : undefined,
    toFulfillmentStatus: row.toFulfillmentStatus
      ? toSharedEnum(row.toFulfillmentStatus, FULFILLMENT_STATUS)
      : undefined,
    actorType: row.actorType === 'merchant' || row.actorType === 'customer' ? row.actorType : 'system',
    actorOpenid: row.actorOpenid ?? undefined,
    actorName: row.actorName ?? undefined,
    note: row.note ?? undefined,
    occurredAt: row.occurredAt.toISOString()
  };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toStatusEventData(input: OrderStatusEventInput): Prisma.OrderStatusEventCreateWithoutOrderInput {
  return {
    type: input.type === 'created' ? 'CREATED' : 'STATUS_CHANGED',
    fromOrderStatus: input.fromOrderStatus ? ORDER_STATUS[input.fromOrderStatus] : undefined,
    toOrderStatus: input.toOrderStatus ? ORDER_STATUS[input.toOrderStatus] : undefined,
    fromPaymentStatus: input.fromPaymentStatus ? PAYMENT_STATUS[input.fromPaymentStatus] : undefined,
    toPaymentStatus: input.toPaymentStatus ? PAYMENT_STATUS[input.toPaymentStatus] : undefined,
    fromFulfillmentStatus: input.fromFulfillmentStatus ? FULFILLMENT_STATUS[input.fromFulfillmentStatus] : undefined,
    toFulfillmentStatus: input.toFulfillmentStatus ? FULFILLMENT_STATUS[input.toFulfillmentStatus] : undefined,
    actorType: input.actorType,
    actorOpenid: input.actorOpenid,
    actorName: input.actorName,
    note: input.note,
    occurredAt: input.occurredAt
  };
}

function clampCustomerOrderLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return 20;
  }

  return Math.min(50, Math.max(1, Math.trunc(value)));
}

function parseCustomerOrderCursor(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.trunc(parsed);
}

function applyCustomerStatusGroup(where: Prisma.OrderWhereInput, statusGroup: CustomerOrderStatusGroup | undefined) {
  if (!statusGroup || statusGroup === 'all') {
    return where;
  }

  if (statusGroup === 'pending') {
    return {
      ...where,
      OR: [
        { status: { in: [ORDER_STATUS.pending_payment, ORDER_STATUS.payment_processing, ORDER_STATUS.payment_failed] } },
        { status: ORDER_STATUS.paid, fulfillmentStatus: FULFILLMENT_STATUS.pending }
      ]
    };
  }

  if (statusGroup === 'completed') {
    return {
      ...where,
      status: ORDER_STATUS.paid,
      fulfillmentStatus: FULFILLMENT_STATUS.completed
    };
  }

  return {
    ...where,
    status: ORDER_STATUS.paid,
    fulfillmentStatus: {
      in: [
        FULFILLMENT_STATUS.in_production,
        FULFILLMENT_STATUS.out_for_delivery,
        FULFILLMENT_STATUS.ready_for_pickup,
        FULFILLMENT_STATUS.ready_to_ship
      ]
    }
  };
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

    async listStatusEvents(orderId: string): Promise<OrderStatusEventRecord[]> {
      const events = await client.orderStatusEvent.findMany({
        where: { orderId },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }]
      });
      return events.map(mapOrderStatusEvent);
    },

    async listByOpenid(openid: string, filters: CustomerOrderListFilters = {}): Promise<CustomerOrderPage> {
      const limit = clampCustomerOrderLimit(filters.limit);
      const offset = parseCustomerOrderCursor(filters.cursor);
      const orders = await client.order.findMany({
        where: applyCustomerStatusGroup({ openid }, filters.statusGroup),
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit + 1
      });
      const hasMore = orders.length > limit;
      const visibleOrders = hasMore ? orders.slice(0, limit) : orders;

      return {
        orders: visibleOrders.map(mapOrder),
        pageInfo: {
          hasMore,
          nextCursor: hasMore ? String(offset + limit) : null,
          limit
        }
      };
    },

    async listAll(): Promise<OrderRecord[]> {
      const orders = await client.order.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return orders.map(mapOrder);
    },

    async listForMerchant(filters: MerchantOrderListFilters = {}): Promise<OrderRecord[]> {
      const scope = filters.scope === 'history' ? 'history' : 'active';
      const where: Prisma.OrderWhereInput = {};

      if (scope === 'history') {
        where.fulfillmentStatus = FULFILLMENT_STATUS.completed;
      } else {
        where.AND = [
          { status: { not: ORDER_STATUS.cancelled } },
          { fulfillmentStatus: { not: FULFILLMENT_STATUS.completed } }
        ];
      }

      if (filters.fulfillmentMode) {
        where.fulfillmentMode = FULFILLMENT_MODE[filters.fulfillmentMode];
      }

      if (filters.keyword) {
        const keyword = filters.keyword.trim();
        if (keyword) {
          where.OR = [
            { id: { contains: keyword } },
            { openid: { contains: keyword } }
          ];
        }
      }

      const orders = await client.order.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
      return orders.map(mapOrder);
    },

    async completeStaleActiveOrders(cutoff: Date, metadata: unknown): Promise<number> {
      const orderModel = client.order as typeof client.order & { findMany?: unknown };
      if (typeof orderModel.findMany !== 'function') {
        return 0;
      }

      const rows = await orderModel.findMany({
        where: {
          status: ORDER_STATUS.paid,
          fulfillmentStatus: {
            in: ACTIVE_FULFILLMENT_STATUSES
          },
          updatedAt: {
            lte: cutoff
          }
        }
      });
      const occurredAt = metadata && typeof metadata === 'object' && 'operatedAt' in metadata
        && typeof metadata.operatedAt === 'string'
        ? new Date(metadata.operatedAt)
        : new Date();
      const activeStatuses: Array<NonNullable<OrderRecord['fulfillmentStatus']>> = [
        'in_production',
        'out_for_delivery',
        'ready_for_pickup',
        'ready_to_ship'
      ];
      let completedCount = 0;

      for (const row of rows) {
        const current = mapOrder(row);
        if (
          current.status !== 'paid'
          || !current.fulfillmentStatus
          || !activeStatuses.includes(current.fulfillmentStatus)
          || new Date(current.updatedAt) > cutoff
        ) {
          continue;
        }

        await client.order.update({
          where: { id: current.id },
          data: {
            fulfillmentStatus: FULFILLMENT_STATUS.completed,
            merchantOverride: metadata as Prisma.InputJsonValue,
            statusEvents: {
              create: toStatusEventData({
                type: 'status_changed',
                fromOrderStatus: current.status,
                toOrderStatus: current.status,
                fromPaymentStatus: current.paymentStatus,
                toPaymentStatus: current.paymentStatus,
                fromFulfillmentStatus: current.fulfillmentStatus,
                toFulfillmentStatus: 'completed',
                actorType: 'system',
                occurredAt
              })
            }
          }
        });
        completedCount += 1;
      }

      return completedCount;
    },

    async createPending(input: CreateOrderInput): Promise<OrderRecord> {
      const existing = await this.getByOpenidAndIdempotencyKey(input.openid, input.idempotencyKey);
      if (existing) {
        return existing;
      }

      const createdAt = new Date();
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
          createdAt,
          statusEvents: {
            create: toStatusEventData({
              type: 'created',
              toOrderStatus: 'pending_payment',
              toPaymentStatus: 'pending',
              toFulfillmentStatus: 'pending',
              actorType: 'customer',
              actorOpenid: input.openid,
              occurredAt: createdAt
            })
          },
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

    async markPaymentProcessing(orderId: string, statusEvent?: OrderStatusEventInput): Promise<OrderRecord> {
      const order = await client.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.payment_processing,
          paymentStatus: PAYMENT_STATUS.processing,
          statusEvents: statusEvent ? { create: toStatusEventData(statusEvent) } : undefined
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
        statusEvent?: OrderStatusEventInput;
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
          merchantOverride: input.merchantOverride as Prisma.InputJsonValue | undefined,
          statusEvents: input.statusEvent ? { create: toStatusEventData(input.statusEvent) } : undefined
        }
      });
      return mapOrder(order);
    }
  };
}
