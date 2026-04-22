import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createPaymentStore, type PaymentStore } from '../shared/payment-store';

export interface GetMyOrderDetailEvent {
  orderId?: string;
}

export async function main(
  event: GetMyOrderDetailEvent = {},
  context?: FunctionContextLike,
  store: Pick<PaymentStore, 'getOrderById'> = createPaymentStore()
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

  return {
    ok: true,
    order
  };
}
