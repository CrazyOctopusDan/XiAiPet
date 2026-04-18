import { isMerchantUserRecord } from '@xiaipet/shared';

import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createMerchantUserStore, type MerchantUserStore } from '../shared/merchant-user-store';

export interface AssertMerchantAccessEvent {
  merchantUser?: unknown;
  openid?: string;
}

async function resolveMerchantUser(
  event: AssertMerchantAccessEvent,
  openid: string,
  store: Pick<MerchantUserStore, 'getByOpenid'>
) {
  const merchantUserFromStore = await store.getByOpenid(openid);

  if (merchantUserFromStore) {
    return merchantUserFromStore;
  }

  const merchantUserFromEvent = isMerchantUserRecord(event.merchantUser) ? event.merchantUser : null;

  if (merchantUserFromEvent?.openid === openid) {
    return merchantUserFromEvent;
  }

  return null;
}

export async function main(
  event: AssertMerchantAccessEvent = {},
  context?: FunctionContextLike,
  store: Pick<MerchantUserStore, 'getByOpenid'> = createMerchantUserStore()
) {
  resolveRuntimeEnv();
  const auth = getAuthContext(event as Record<string, unknown>, context);
  const merchantUser = await resolveMerchantUser(event, auth.openid, store);

  if (!merchantUser || merchantUser.openid !== auth.openid || !merchantUser.enabled) {
    return {
      ok: true,
      status: 'denied',
      allowed: false,
      reason: '当前账号还未加入 merchant_users 白名单'
    };
  }

  return {
    ok: true,
    status: 'allowed',
    allowed: true,
    merchant: {
      merchantId: merchantUser.merchantId,
      storeName: merchantUser.storeName
    },
    merchantUser
  };
}
