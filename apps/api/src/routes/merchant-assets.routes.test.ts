import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { authHeader, testConfig } from './test-helpers';

const allowedIdentity = {
  bootstrapUser: async () => ({ ok: true }),
  bindPhone: async () => ({ ok: true }),
  assertMerchantAccess: async () => ({
    ok: true,
    status: 'allowed',
    allowed: true,
    merchant: { merchantId: 'm1', storeName: 'store' }
  })
};

describe('merchant asset routes', () => {
  it('routes upload policy and confirm calls through merchant auth', async () => {
    const assetService = {
      createUploadPolicy: vi.fn(() => ({
        ok: true,
        upload: {
          url: 'https://xiaipet-test-assets.oss-cn-shanghai.aliyuncs.com',
          objectKey: 'merchant/m1/assets/product-cover/2026/a-display.jpg'
        }
      })),
      confirmUpload: vi.fn(() => ({
        ok: true,
        storageId: 'oss://xiaipet-test-assets/merchant/m1/assets/product-cover/2026/a-display.jpg'
      }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: allowedIdentity,
        assetService
      }
    });
    const headers = authHeader('merchant');

    const policy = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/assets/upload-policies',
      headers,
      payload: { role: 'product-cover', variantName: 'display' }
    });
    const confirm = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/assets/uploads/confirm',
      headers,
      payload: { objectKey: 'merchant/m1/assets/product-cover/2026/a-display.jpg' }
    });

    expect(policy.statusCode).toBe(200);
    expect(confirm.statusCode).toBe(200);
    expect(assetService.createUploadPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: 'm1' }),
      { role: 'product-cover', variantName: 'display' }
    );
    expect(assetService.confirmUpload).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: 'm1' }),
      { objectKey: 'merchant/m1/assets/product-cover/2026/a-display.jpg' }
    );
  });

  it('rejects asset calls before service invocation when merchant access is denied', async () => {
    const assetService = {
      createUploadPolicy: vi.fn(() => ({ ok: true })),
      confirmUpload: vi.fn(() => ({ ok: true }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({ ok: true, status: 'denied', allowed: false })
        },
        assetService
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/assets/upload-policies',
      headers: authHeader('denied'),
      payload: { role: 'product-cover', variantName: 'display' }
    });

    expect(response.statusCode).toBe(403);
    expect(assetService.createUploadPolicy).not.toHaveBeenCalled();
  });
});
