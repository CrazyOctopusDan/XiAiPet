import type { PrismaClient } from '@prisma/client';

import { createCatalogRepository } from '../catalog/repository';
import { createOrderRepository, type CreateOrderInput, type OrderRecord } from './repository';
import { getPrismaClient } from '../../db/prisma';
import { ApiError } from '../../lib/errors';
import type { MerchantContext } from '../auth/types';
import type { PaymentProvider } from '../payments/provider';
import { createMockPaymentProvider } from '../payments/provider';
import { createBalanceService } from '../users/balance-service';
import { createPaymentRepository } from '../payments/repository';

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
      const candidate = payload as Partial<CreateOrderInput> & { id?: string };
      const order = await this.createPendingOrder({
        id: candidate.id ?? `order-${Date.now()}`,
        openid,
        idempotencyKey: candidate.idempotencyKey ?? `idem-${Date.now()}`,
        paymentMethod: candidate.paymentMethod ?? 'wechat',
        fulfillmentMode: candidate.fulfillmentMode ?? 'pickup',
        itemsSubtotal: candidate.itemsSubtotal ?? 0,
        deliveryFee: candidate.deliveryFee ?? 0,
        payableTotal: candidate.payableTotal ?? 0,
        snapshot: candidate.snapshot ?? payload,
        items: candidate.items ?? []
      });
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

    async queryMerchantOrders(_merchantContext: MerchantContext, _filters: Record<string, unknown> = {}) {
      const orders = await createOrderRepository(client).listAll();
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
