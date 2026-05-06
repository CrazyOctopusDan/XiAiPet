import type { OrderStore } from '../shared/order-store';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createOrderStore } from '../shared/order-store';
import { createReceiptPrintJob } from '../shared/order-receipt-print';

export interface PrepareOrderReceiptPrintEvent {
  orderId?: string;
  merchantUser?: unknown;
  openid?: string;
  now?: string;
}

export async function main(
  event: PrepareOrderReceiptPrintEvent = {},
  context?: FunctionContextLike,
  store: Pick<OrderStore, 'getById'> = createOrderStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  if (!event.orderId) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const order = await store.getById(event.orderId);

  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const now = event.now ?? new Date().toISOString();

  return {
    ok: true,
    job: createReceiptPrintJob(order, now)
  };
}
