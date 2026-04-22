import type { OrderRecord } from '@xiaipet/shared';

import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createPaymentStore, type PaymentStore } from '../shared/payment-store';

export interface PayOrderEvent {
  orderId?: string;
  now?: string;
}

export async function main(
  event: PayOrderEvent = {},
  context?: FunctionContextLike,
  store: PaymentStore = createPaymentStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const auth = getAuthContext(event as Record<string, unknown>, context);

  if (!event.orderId) {
    throw new Error('Invalid pay-order payload');
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
      paymentStatus: 'paid' as const,
      order
    };
  }

  if (order.paymentMethod === 'wechat') {
    const config = await store.getWechatPayConfig();

    if (!config.enabled || !config.appid || !config.mchid || !config.notifyUrl) {
      return {
        ok: false,
        code: 'WECHAT_PAY_NOT_CONFIGURED',
        order
      };
    }

    const processingOrder: OrderRecord = {
      ...order,
      status: 'payment_processing',
      payment: {
        method: 'wechat',
        status: 'processing'
      },
      updatedAt: event.now ?? new Date().toISOString()
    };

    const savedOrder = await store.saveOrder(processingOrder);

    return {
      ok: true,
      paymentStatus: 'processing' as const,
      order: savedOrder,
      paymentParams: {
        timeStamp: String(Date.now()),
        nonceStr: `nonce-${savedOrder.id}`,
        package: `prepay_id=${savedOrder.id}`,
        signType: 'RSA',
        paySign: 'pending-config'
      }
    };
  }

  const result = await store.finalizeBalancePayment(order, event.now ?? new Date().toISOString());

  if ('error' in result) {
    return {
      ok: false,
      code: result.error,
      order
    };
  }

  return {
    ok: true,
    paymentStatus: 'paid' as const,
    order: result.order,
    balanceAfter: result.balanceAfter
  };
}
