import type { OrderRecord } from '@xiaipet/shared';

import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createPaymentStore, type PaymentStore } from '../shared/payment-store';

export interface SyncOrderPaymentEvent {
  orderId?: string;
  now?: string;
}

export async function main(
  event: SyncOrderPaymentEvent = {},
  context?: FunctionContextLike,
  store: Pick<PaymentStore, 'getOrderById' | 'saveOrder' | 'getWechatPayConfig'> = createPaymentStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const auth = getAuthContext(event as Record<string, unknown>, context);

  if (!event.orderId) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const order = await store.getOrderById(event.orderId);

  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  if (order.openid !== auth.openid) {
    throw new Error('ORDER_FORBIDDEN');
  }

  if (order.status === 'paid') {
    return {
      ok: true,
      order
    };
  }

  if (order.paymentMethod !== 'wechat') {
    return {
      ok: true,
      order
    };
  }

  const config = await store.getWechatPayConfig();

  if (!config.enabled) {
    return {
      ok: true,
      order
    };
  }

  const latestOrder: OrderRecord = {
    ...order,
    updatedAt: event.now ?? new Date().toISOString()
  };

  return {
    ok: true,
    order: await store.saveOrder(latestOrder)
  };
}
