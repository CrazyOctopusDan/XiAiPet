import type { OrderRecord, PaymentMethod } from '@xiaipet/shared';

import { resolveRuntimeEnv } from '../shared/env';

export interface ConfirmPaymentEvent {
  order?: Pick<OrderRecord, 'id' | 'status' | 'pricing' | 'snapshot'>;
  paymentMethod?: PaymentMethod;
  paymentStatus?: 'paid' | 'pending_wechat' | 'failed';
  now?: string;
}

export async function main(event: ConfirmPaymentEvent = {}) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');

  if (!event.order?.id || !event.order.snapshot || !event.paymentMethod || !event.paymentStatus) {
    throw new Error('Invalid confirm-payment payload');
  }

  if (event.paymentStatus === 'failed') {
    return {
      ok: false,
      code: 'PAYMENT_FAILED'
    };
  }

  const now = event.now ?? new Date().toISOString();

  return {
    ok: true,
    order: {
      ...event.order,
      status: 'paid',
      updatedAt: now
    },
    inventoryAdjustments: event.order.snapshot.items.map((item) => ({
      productId: item.productId,
      quantityDelta: -item.quantity
    })),
    balanceAdjustment:
      event.paymentMethod === 'balance'
        ? {
            amount: -event.order.pricing.payableTotal
          }
        : null
  };
}
