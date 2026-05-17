import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { merchantAccountAuthHeader, testConfig } from './test-helpers';

const merchantAccount = {
  id: 'acct-admin',
  username: 'admin',
  passwordHash: 'hidden',
  role: 'admin' as const,
  status: 'active' as const,
  mustChangePassword: false,
  createdBy: null,
  lastLoginAt: null,
  createdAt: new Date('2026-05-13T00:00:00.000Z'),
  updatedAt: new Date('2026-05-13T00:00:00.000Z')
};

function merchantAccountService(overrides: Partial<typeof merchantAccount> = {}) {
  const account = { ...merchantAccount, ...overrides };
  return {
    bootstrapInitialAdmin: async () => ({ ok: true }),
    login: async () => ({ ok: true as const, account }),
    getActiveAccount: async () => account,
    changePassword: async () => ({ ok: true as const, account }),
    listAccounts: async () => ({ ok: true, accounts: [] }),
    createStaffAccount: async () => ({ ok: true }),
    disableStaffAccount: async () => ({ ok: true }),
    resetStaffPassword: async () => ({ ok: true })
  };
}

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
        merchantAccountService: merchantAccountService(),
        assetService
      }
    });
    const headers = merchantAccountAuthHeader({ accountId: 'acct-admin' });

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
      expect.objectContaining({ merchantId: 'default-merchant' }),
      { role: 'product-cover', variantName: 'display' }
    );
    expect(assetService.confirmUpload).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: 'default-merchant' }),
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
        merchantAccountService: merchantAccountService({ mustChangePassword: true }),
        assetService
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/assets/upload-policies',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin', mustChangePassword: true }),
      payload: { role: 'product-cover', variantName: 'display' }
    });

    expect(response.statusCode).toBe(403);
    expect(assetService.createUploadPolicy).not.toHaveBeenCalled();
  });
});
