import type { PrismaClient } from '@prisma/client';

import { createCatalogRepository } from '../catalog/repository';
import {
  createOrderRepository,
  type CreateOrderInput,
  type MerchantOrderListFilters,
  type OrderRecord
} from './repository';
import { getPrismaClient } from '../../db/prisma';
import { ApiError } from '../../lib/errors';
import type { MerchantContext } from '../auth/types';
import type { PaymentProvider } from '../payments/provider';
import { createMockPaymentProvider } from '../payments/provider';
import { createBalanceService } from '../users/balance-service';
import { createPaymentRepository } from '../payments/repository';

interface CustomerOrderPayload {
  id?: string;
  idempotencyKey?: string;
  paymentMethod?: 'wechat' | 'balance';
  fulfillmentMode?: 'delivery' | 'pickup' | 'express';
  itemsSubtotal?: number;
  deliveryFee?: number;
  payableTotal?: number;
  fulfillment?: {
    mode?: 'delivery' | 'pickup' | 'express';
  };
  pricing?: {
    itemsSubtotal?: number;
    deliveryFee?: number;
    payableTotal?: number;
  };
  items?: unknown[];
}

interface CustomerOrderItemPayload {
  productId?: unknown;
  name?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  specId?: unknown;
  specLabel?: unknown;
  lineTotal?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeOrderItems(items: unknown): CreateOrderInput['items'] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is CustomerOrderItemPayload => isObject(item))
    .map((item) => ({
      productId: String(item.productId ?? ''),
      name: String(item.name ?? ''),
      quantity: Math.max(0, Math.trunc(toNumber(item.quantity))),
      unitPrice: toNumber(item.unitPrice),
      specId: String(item.specId ?? ''),
      specLabel: String(item.specLabel ?? ''),
      lineTotal: toNumber(item.lineTotal)
    }))
    .filter((item) => item.productId && item.name && item.quantity > 0);
}

function normalizeCreateOrderPayload(openid: string, payload: unknown): CreateOrderInput {
  const candidate = payload as CustomerOrderPayload;
  const pricing = isObject(candidate.pricing) ? candidate.pricing : null;
  const fulfillment = isObject(candidate.fulfillment) ? candidate.fulfillment : null;
  const paymentMethod = candidate.paymentMethod === 'balance' ? 'balance' : 'wechat';
  const fulfillmentMode =
    fulfillment?.mode === 'delivery' || fulfillment?.mode === 'express' || fulfillment?.mode === 'pickup'
      ? fulfillment.mode
      : candidate.fulfillmentMode ?? 'pickup';

  return {
    id: candidate.id ?? `order-${Date.now()}`,
    openid,
    idempotencyKey: candidate.idempotencyKey ?? `idem-${Date.now()}`,
    paymentMethod,
    fulfillmentMode,
    itemsSubtotal: toNumber(pricing?.itemsSubtotal, candidate.itemsSubtotal ?? 0),
    deliveryFee: toNumber(pricing?.deliveryFee, candidate.deliveryFee ?? 0),
    payableTotal: toNumber(pricing?.payableTotal, candidate.payableTotal ?? 0),
    snapshot: payload,
    items: normalizeOrderItems(candidate.items)
  };
}

function getFirstString(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

function normalizeMerchantOrderFilters(filters: Record<string, unknown> = {}): MerchantOrderListFilters {
  const rawScope = getFirstString(filters.scope);
  const rawFulfillmentMode = getFirstString(filters.fulfillmentMode);
  const keyword = getFirstString(filters.keyword)?.trim();
  const result: MerchantOrderListFilters = {
    scope: rawScope === 'history' ? 'history' : 'active'
  };

  if (rawFulfillmentMode === 'delivery' || rawFulfillmentMode === 'pickup' || rawFulfillmentMode === 'express') {
    result.fulfillmentMode = rawFulfillmentMode;
  }

  if (keyword) {
    result.keyword = keyword;
  }

  return result;
}

export function createOrderService(
  client: PrismaClient = getPrismaClient(),
  paymentProvider: PaymentProvider = createMockPaymentProvider()
) {
  return {
    async createPendingOrder(input: CreateOrderInput): Promise<OrderRecord> {
      return client.$transaction(async (tx) => {
        const orderRepository = createOrderRepository(tx);
        const catalogRepository = createCatalogRepository(tx);
        const existing = await orderRepository.getByOpenidAndIdempotencyKey(input.openid, input.idempotencyKey);

        if (existing) {
          return existing;
        }

        const order = await orderRepository.createPending(input);

        for (const item of input.items) {
          await catalogRepository.decrementStock(item.productId, item.quantity);
        }

        return order;
      });
    },

    async createCustomerOrder(openid: string, payload: unknown): Promise<{ ok: true; order: OrderRecord }> {
      if (!payload || typeof payload !== 'object') {
        throw new ApiError('INVALID_ORDER', 'Invalid order payload', 400);
      }
      const user = await client.user.findUnique({
        where: { openid },
        select: { phoneBindingState: true }
      });
      if (!user || user.phoneBindingState !== 'BOUND') {
        throw new ApiError('CUSTOMER_NOT_REGISTERED', 'Customer must bind phone before ordering', 403);
      }
      const order = await this.createPendingOrder(normalizeCreateOrderPayload(openid, payload));
      return { ok: true, order };
    },

    async startCustomerPayment(openid: string, orderId: string, payload: unknown = {}) {
      const orderRepository = createOrderRepository(client);
      const order = await orderRepository.getById(orderId);
      if (!order || order.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (order.paymentStatus === 'paid') {
        return { ok: true as const, paymentStatus: 'paid', order };
      }
      if (order.paymentMethod === 'balance') {
        try {
          const balance = await createBalanceService(client).adjustBalance({
            openid,
            amountDelta: -order.pricing.payableTotal,
            type: 'order_payment',
            orderId,
            idempotencyKey: `order-payment-${orderId}`,
            metadata: payload
          });
          const paidOrder = await createPaymentRepository(client).markOrderPaid(orderId);
          return {
            ok: true as const,
            paymentStatus: 'paid',
            order: paidOrder,
            balanceAfter: balance.balanceAfter
          };
        } catch {
          return {
            ok: false as const,
            code: 'INSUFFICIENT_BALANCE',
            message: 'Insufficient balance',
            paymentStatus: 'blocked'
          };
        }
      }
      const processing = await orderRepository.markPaymentProcessing(orderId);
      const paymentParams = await paymentProvider.startWechatPayment(processing, { openid });
      return {
        ok: true as const,
        paymentStatus: 'pending_wechat',
        order: processing,
        paymentParams: paymentParams.paymentParams
      };
    },

    async confirmCustomerPayment(openid: string, orderId: string, payload: unknown = {}) {
      const orderRepository = createOrderRepository(client);
      const order = await orderRepository.getById(orderId);
      if (!order || order.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      const paidOrder = await createPaymentRepository(client).markOrderPaid(orderId);
      return { ok: true as const, order: paidOrder, confirmation: payload };
    },

    async syncCustomerPayment(openid: string, orderId: string) {
      const order = await createOrderRepository(client).getById(orderId);
      if (!order || order.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      return { ok: true as const, order };
    },

    async queryCustomerOrders(openid: string, _filters: Record<string, unknown> = {}) {
      const orders = await createOrderRepository(client).listByOpenid(openid);
      return { ok: true as const, orders };
    },

    async getCustomerOrderDetail(openid: string, orderId: string) {
      const order = await createOrderRepository(client).getById(orderId);
      if (!order || order.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      return { ok: true as const, order };
    },

    async queryMerchantOrders(_merchantContext: MerchantContext, filters: Record<string, unknown> = {}) {
      const orders = await createOrderRepository(client).listForMerchant(normalizeMerchantOrderFilters(filters));
      return { ok: true as const, orders };
    },

    async getMerchantOrderDetail(_merchantContext: MerchantContext, orderId: string) {
      const order = await createOrderRepository(client).getById(orderId);
      if (!order) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      return { ok: true as const, order };
    },

    async updateMerchantOrderStatus(merchantContext: MerchantContext, orderId: string, payload: unknown) {
      if (!payload || typeof payload !== 'object') {
        throw new ApiError('INVALID_ORDER_STATUS', 'Invalid order status payload', 400);
      }
      const current = await createOrderRepository(client).getById(orderId);
      if (!current) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (current.status === 'cancelled' || current.fulfillmentStatus === 'completed') {
        throw new ApiError('ORDER_TERMINAL', 'Terminal order cannot be updated', 409);
      }
      const candidate = payload as {
        status?: OrderRecord['status'];
        paymentStatus?: OrderRecord['paymentStatus'];
        fulfillmentStatus?: NonNullable<OrderRecord['fulfillmentStatus']>;
      };
      const order = await createOrderRepository(client).updateStatus(orderId, {
        status: candidate.status,
        paymentStatus: candidate.paymentStatus,
        fulfillmentStatus: candidate.fulfillmentStatus,
        paidAt: candidate.status === 'paid' ? new Date() : undefined,
        cancelledAt: candidate.status === 'cancelled' ? new Date() : undefined,
        merchantOverride: {
          actorOpenid: merchantContext.openid,
          actorName: merchantContext.storeName,
          operatedAt: new Date().toISOString(),
          payload
        }
      });
      return { ok: true as const, order };
    }
  };
}
