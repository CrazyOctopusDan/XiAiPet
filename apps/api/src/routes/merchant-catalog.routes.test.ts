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

function merchantAccountService() {
  return {
    bootstrapInitialAdmin: async () => ({ ok: true }),
    login: async () => ({ ok: true as const, account: merchantAccount }),
    getActiveAccount: async () => merchantAccount,
    changePassword: async () => ({ ok: true as const, account: merchantAccount }),
    listAccounts: async () => ({ ok: true, accounts: [] }),
    createStaffAccount: async () => ({ ok: true }),
    disableStaffAccount: async () => ({ ok: true }),
    resetStaffPassword: async () => ({ ok: true })
  };
}

function createCatalogServiceStub(overrides: Record<string, unknown> = {}) {
  return {
    queryCustomerCategories: async () => ({ ok: true }),
    queryCustomerProducts: async () => ({ ok: true }),
    queryCustomerCategoryProducts: async () => ({ ok: true }),
    getCustomerProductDetail: async () => ({ ok: true }),
    searchCustomerProducts: async () => ({ ok: true }),
    queryMerchantCategories: async () => ({ ok: true }),
    upsertMerchantCategory: async () => ({ ok: true }),
    reorderMerchantCategories: async () => ({ ok: true }),
    deleteMerchantCategory: async () => ({ ok: true }),
    queryMerchantProducts: async () => ({ ok: true }),
    getMerchantProductDetail: async () => ({ ok: true }),
    upsertMerchantProduct: async () => ({ ok: true }),
    deleteMerchantProduct: async () => ({ ok: true }),
    ...overrides
  };
}

describe('merchant catalog routes', () => {
  it('routes merchant product paging with parsed params under merchant auth', async () => {
    const queryMerchantProducts = vi.fn(async () => ({ ok: true, items: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: merchantAccountService(),
        catalogService: createCatalogServiceStub({ queryMerchantProducts })
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/products?categoryId=cakes&status=published&keyword=%E5%8D%97%E7%93%9C&sort=latest&limit=20',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin' })
    });

    expect(response.statusCode).toBe(200);
    expect(queryMerchantProducts).toHaveBeenCalledWith({
      categoryId: 'cakes',
      status: 'published',
      keyword: '南瓜',
      sort: 'latest',
      limit: 20,
      cursor: undefined
    });
  });

  it('routes merchant product detail under merchant auth', async () => {
    const getMerchantProductDetail = vi.fn(async () => ({ ok: true, product: { id: 'pumpkin-cake' } }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: merchantAccountService(),
        catalogService: createCatalogServiceStub({ getMerchantProductDetail })
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/products/pumpkin-cake',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin' })
    });

    expect(response.statusCode).toBe(200);
    expect(getMerchantProductDetail).toHaveBeenCalledWith('pumpkin-cake');
  });

  it('routes merchant category reorder under merchant auth', async () => {
    const reorderMerchantCategories = vi.fn(async () => ({ ok: true, categories: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: merchantAccountService(),
        catalogService: createCatalogServiceStub({ reorderMerchantCategories })
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/categories/reorder',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin' }),
      payload: {
        items: [
          { id: 'snacks', sortOrder: 1 },
          { id: 'cakes', sortOrder: 2 }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(reorderMerchantCategories).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: merchantAccount.id,
        username: merchantAccount.username,
        role: merchantAccount.role
      }),
      {
        items: [
          { id: 'snacks', sortOrder: 1 },
          { id: 'cakes', sortOrder: 2 }
        ]
      }
    );
  });
});
