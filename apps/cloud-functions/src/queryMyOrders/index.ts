import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createPaymentStore, type PaymentStore } from '../shared/payment-store';

export async function main(
  event: Record<string, unknown> = {},
  context?: FunctionContextLike,
  store: Pick<PaymentStore, 'listOrdersByOpenid'> = createPaymentStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const auth = getAuthContext(event, context);
  const orders = await store.listOrdersByOpenid(auth.openid);

  return {
    ok: true,
    orders: [...orders].sort((left, right) => {
      const createdAtDiff = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return right.id.localeCompare(left.id);
    })
  };
}
