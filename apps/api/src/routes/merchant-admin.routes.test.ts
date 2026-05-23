import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { merchantAccountAuthHeader, testConfig } from './test-helpers';

const defaultMerchantAccount = {
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

function createMerchantAccountService(overrides: Partial<typeof defaultMerchantAccount> = {}) {
  const account = { ...defaultMerchantAccount, ...overrides };
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

describe('merchant admin routes', () => {
  it('routes catalog, user, balance and runtime config admin calls', async () => {
    const catalogService = {
      queryCustomerCategories: vi.fn(async () => ({ ok: true })),
      queryCustomerProducts: vi.fn(async () => ({ ok: true })),
      queryMerchantCategories: vi.fn(async () => ({ ok: true, categories: [] })),
      upsertMerchantCategory: vi.fn(async () => ({ ok: true, category: { id: 'cat-1' } })),
      deleteMerchantCategory: vi.fn(async () => ({ ok: true, deletedCategoryId: 'cat-1' })),
      queryMerchantProducts: vi.fn(async () => ({ ok: true, products: [] })),
      upsertMerchantProduct: vi.fn(async () => ({ ok: true, product: { id: 'p1' } })),
      deleteMerchantProduct: vi.fn(async () => ({ ok: true, deletedProductId: 'p1' }))
    };
    const merchantUserService = {
      searchMerchantUsers: vi.fn(async () => ({ ok: true, users: [] })),
      getMerchantUserDetail: vi.fn(async () => ({ ok: true, user: { openid: 'openid-1' } })),
      getMerchantUserAddresses: vi.fn(async () => ({ ok: true, addresses: [] })),
      getMerchantUserBalanceLedgers: vi.fn(async () => ({ ok: true, records: [], pagination: { nextCursor: null, hasMore: false, limit: 20, total: 0 } })),
      adjustUserBalance: vi.fn(async () => ({ ok: true, balanceAfter: 20, ledger: { id: 'l1' } }))
    };
    const runtimeConfigService = {
      parseSectionKeys: (input?: string | string[]) => (Array.isArray(input) ? input : input?.split(',')),
      readCustomerRuntimeConfig: vi.fn(async () => ({ ok: true })),
      getRuntimeConfigSections: vi.fn(async () => ({ ok: true, sections: [] })),
      readMerchantRuntimeConfig: vi.fn(async () => ({ ok: true, sections: [] })),
      upsertRuntimeConfigSection: vi.fn(async () => ({ ok: true, section: { sectionId: 'banner' } }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: createMerchantAccountService(),
        catalogService,
        merchantUserService,
        runtimeConfigService
      }
    });

    const headers = merchantAccountAuthHeader({ accountId: 'acct-admin', role: 'admin' });
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/categories', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PUT', url: '/api/v1/merchant/categories/cat-1', headers, payload: { name: 'Cat', iconToken: 'C' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'DELETE', url: '/api/v1/merchant/categories/cat-1', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/products', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PUT', url: '/api/v1/merchant/products/p1', headers, payload: { invalid: true } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'DELETE', url: '/api/v1/merchant/products/p1', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/users?query=138', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/users/openid-1', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/users/openid-1/addresses', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/users/openid-1/balance-ledgers?cursor=20&limit=20', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/v1/merchant/users/openid-1/balance-adjustments', headers, payload: { delta: 20 } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/runtime-config/sections', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/runtime-config?sectionKeys=banner', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PUT', url: '/api/v1/merchant/runtime-config/sections/banner', headers, payload: { value: {} } })).statusCode).toBe(200);

    expect(catalogService.upsertMerchantProduct).toHaveBeenCalled();
    expect(catalogService.deleteMerchantProduct).toHaveBeenCalled();
    expect(merchantUserService.getMerchantUserDetail).toHaveBeenCalledWith(expect.any(Object), 'openid-1');
    expect(merchantUserService.getMerchantUserAddresses).toHaveBeenCalledWith(expect.any(Object), 'openid-1');
    expect(merchantUserService.getMerchantUserBalanceLedgers).toHaveBeenCalledWith(expect.any(Object), 'openid-1', {
      cursor: '20',
      limit: '20'
    });
    expect(merchantUserService.adjustUserBalance).toHaveBeenCalled();
    expect(runtimeConfigService.upsertRuntimeConfigSection).toHaveBeenCalled();
  });

  it('rejects denied merchants before admin service calls', async () => {
    const queryMerchantProducts = vi.fn(async () => ({ ok: true, products: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: createMerchantAccountService({ mustChangePassword: true }),
        catalogService: {
          queryCustomerCategories: async () => ({ ok: true }),
          queryCustomerProducts: async () => ({ ok: true }),
          queryMerchantCategories: async () => ({ ok: true }),
          upsertMerchantCategory: async () => ({ ok: true }),
          deleteMerchantCategory: async () => ({ ok: true }),
          queryMerchantProducts,
          upsertMerchantProduct: async () => ({ ok: true }),
          deleteMerchantProduct: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/products',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin', mustChangePassword: true })
    });
    expect(response.statusCode).toBe(403);
    expect(queryMerchantProducts).not.toHaveBeenCalled();
  });

  it('allows admin to manage staff accounts and rejects staff balance adjustments', async () => {
    const adminAccount = {
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
    const staffAccount = {
      ...adminAccount,
      id: 'acct-staff',
      username: 'staff01',
      role: 'staff' as const
    };
    const merchantAccountService = {
      bootstrapInitialAdmin: async () => ({ ok: true }),
      login: async () => ({ ok: true as const, account: adminAccount }),
      getActiveAccount: async (accountId: string) => (accountId === 'acct-staff' ? staffAccount : adminAccount),
      changePassword: async () => ({ ok: true as const, account: adminAccount }),
      listAccounts: vi.fn(async () => ({ ok: true, accounts: [adminAccount, staffAccount] })),
      createStaffAccount: vi.fn(async () => ({ ok: true, account: staffAccount, initialPassword: 'staff' })),
      disableStaffAccount: vi.fn(async () => ({ ok: true, account: { ...staffAccount, status: 'disabled' } })),
      resetStaffPassword: vi.fn(async () => ({ ok: true, account: staffAccount, resetPassword: 'staff' }))
    };
    const adjustUserBalance = vi.fn(async () => ({ ok: true }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService,
        merchantUserService: {
          searchMerchantUsers: async () => ({ ok: true, users: [] }),
          getMerchantUserDetail: async () => ({ ok: true, user: { openid: 'openid-1' } }),
          getMerchantUserAddresses: async () => ({ ok: true, addresses: [] }),
          getMerchantUserBalanceLedgers: async () => ({ ok: true, records: [], pagination: { nextCursor: null, hasMore: false, limit: 20, total: 0 } }),
          adjustUserBalance
        }
      }
    });

    const adminHeaders = merchantAccountAuthHeader({ accountId: 'acct-admin', role: 'admin' });
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/accounts', headers: adminHeaders })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/v1/merchant/accounts/staff', headers: adminHeaders, payload: { username: 'staff02' } })).statusCode).toBe(200);

    const staffHeaders = merchantAccountAuthHeader({ accountId: 'acct-staff', username: 'staff01', role: 'staff' });
    const balanceResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/users/openid-1/balance-adjustments',
      headers: staffHeaders,
      payload: { delta: 10 }
    });

    expect(balanceResponse.statusCode).toBe(403);
    expect(adjustUserBalance).not.toHaveBeenCalled();
  });
});
