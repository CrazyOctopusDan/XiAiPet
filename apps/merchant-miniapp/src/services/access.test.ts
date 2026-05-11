import { describe, expect, it, vi } from 'vitest';

import type { MerchantApiRequester } from './api-client';
import { verifyMerchantAccess } from './access';

describe('merchant access service', () => {
  it('reads allowed access from the merchant HTTP access API', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 'allowed',
      allowed: true,
      merchant: {
        merchantId: 'merchant-001',
        storeName: '虾衣宠物烘焙工作室'
      }
    });

    await expect(verifyMerchantAccess(request as MerchantApiRequester)).resolves.toMatchObject({
      ok: true,
      status: 'allowed',
      allowed: true,
      merchant: {
        merchantId: 'merchant-001'
      }
    });
    expect(request).toHaveBeenCalledWith('/api/v1/merchant/access', {
      method: 'GET',
      auth: 'customer'
    });
  });

  it('returns denied access without CloudBase result wrapping', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 'denied',
      allowed: false,
      reason: '当前账号还没有商户权限'
    });

    await expect(verifyMerchantAccess(request as MerchantApiRequester)).resolves.toMatchObject({
      status: 'denied',
      allowed: false,
      reason: '当前账号还没有商户权限'
    });
  });
});
