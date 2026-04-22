import {
  isMerchantUserBalanceAdjustmentPayload
} from '../../../../packages/shared/src/schema/user-admin';
import type { MerchantUserBalanceAdjustmentPayload } from '@xiaipet/shared/types/user-admin';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createPaymentStore, type PaymentStore } from '../shared/payment-store';

export interface AdjustUserBalanceEvent {
  payload?: unknown;
  merchantUser?: unknown;
  openid?: string;
}

export async function main(
  event: AdjustUserBalanceEvent = {},
  context?: FunctionContextLike,
  store: Pick<PaymentStore, 'applyMerchantBalanceAdjustment'> = createPaymentStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  if (!isMerchantUserBalanceAdjustmentPayload(event.payload)) {
    throw new Error('INVALID_BALANCE_ADJUSTMENT');
  }

  const result = await store.applyMerchantBalanceAdjustment(event.payload);

  if ('error' in result) {
    throw new Error(result.error);
  }

  return {
    ok: true,
    balanceAfter: result.balanceAfter,
    ledger: result.ledger
  };
}
