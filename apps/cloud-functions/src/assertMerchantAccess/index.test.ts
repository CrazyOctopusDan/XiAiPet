import { describe, expect, it } from 'vitest';

import type { MerchantUserRecord } from '@xiaipet/shared';

import { assertMerchantAccessWithStore } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

function createMerchantUser(overrides: Partial<MerchantUserRecord> = {}): MerchantUserRecord {
  return {
    openid: 'merchant-openid',
    merchantId: 'merchant-001',
    storeName: '虾衣宠物烘焙工作室',
    enabled: true,
    grantedAt: '2026-04-01T00:00:00.000Z',
    ...overrides
  };
}

describe('assertMerchantAccess cloud function', () => {
  it('allows a merchant by looking up whitelist data from openid when no merchantUser payload is supplied', async () => {
    const result = await assertMerchantAccessWithStore(
      {},
      { OPENID: 'merchant-openid' },
      {
        getByOpenid: async (openid: string) => createMerchantUser({ openid })
      }
    );

    expect(result).toMatchObject({
      ok: true,
      status: 'allowed',
      allowed: true,
      merchant: {
        merchantId: 'merchant-001',
        storeName: '虾衣宠物烘焙工作室'
      }
    });
  });

  it('denies a disabled whitelist entry even when auth openid matches', async () => {
    const result = await assertMerchantAccessWithStore(
      {},
      { OPENID: 'merchant-openid' },
      {
        getByOpenid: async () => createMerchantUser({ enabled: false })
      }
    );

    expect(result).toMatchObject({
      ok: true,
      status: 'denied',
      allowed: false
    });
  });
});
