import type { PaymentMethod } from '@xiaipet/shared';

import { resolveRuntimeEnv } from '../shared/env';

export interface CreatePaymentEvent {
  order?: {
    id?: string;
    pricing?: {
      payableTotal?: number;
    };
  };
  paymentMethod?: PaymentMethod;
  customerBalance?: number;
}

export async function main(event: CreatePaymentEvent = {}) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');

  if (!event.order?.id || typeof event.order.pricing?.payableTotal !== 'number' || !event.paymentMethod) {
    throw new Error('Invalid create-payment payload');
  }

  if (event.paymentMethod === 'wechat') {
    return {
      ok: true,
      paymentStatus: 'pending_wechat',
      paymentParams: {
        nonceStr: `nonce-${event.order.id}`,
        package: `prepay_id=${event.order.id}`,
        signType: 'RSA'
      }
    };
  }

  if ((event.customerBalance ?? 0) < event.order.pricing.payableTotal) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      paymentStatus: 'blocked'
    };
  }

  return {
    ok: true,
    paymentStatus: 'paid',
    balanceAfter: Number(((event.customerBalance ?? 0) - event.order.pricing.payableTotal).toFixed(2))
  };
}
