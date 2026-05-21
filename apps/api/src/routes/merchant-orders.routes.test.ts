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

describe('merchant order routes', () => {
  it('rejects before merchant order service when access is denied', async () => {
    const queryMerchantOrders = vi.fn(async () => ({ ok: true, orders: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: merchantAccountService({ mustChangePassword: true }),
        orderService: {
          createCustomerOrder: async () => ({ ok: true }),
          startCustomerPayment: async () => ({ ok: true }),
          confirmCustomerPayment: async () => ({ ok: true }),
          syncCustomerPayment: async () => ({ ok: true }),
          queryCustomerOrders: async () => ({ ok: true }),
          getCustomerOrderDetail: async () => ({ ok: true }),
          queryMerchantOrders,
          getMerchantOrderDetail: async () => ({ ok: true }),
          updateMerchantOrderStatus: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/orders',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin', mustChangePassword: true })
    });
    expect(response.statusCode).toBe(403);
    expect(queryMerchantOrders).not.toHaveBeenCalled();
  });

  it('routes merchant list detail and status update for allowed merchants', async () => {
    const orderService = {
      createCustomerOrder: vi.fn(async () => ({ ok: true })),
      startCustomerPayment: vi.fn(async () => ({ ok: true })),
      confirmCustomerPayment: vi.fn(async () => ({ ok: true })),
      syncCustomerPayment: vi.fn(async () => ({ ok: true })),
      queryCustomerOrders: vi.fn(async () => ({ ok: true })),
      getCustomerOrderDetail: vi.fn(async () => ({ ok: true })),
      queryMerchantOrders: vi.fn(async () => ({ ok: true, orders: [] })),
      getMerchantOrderDetail: vi.fn(async () => ({ ok: true, order: { id: 'order-1' } })),
      updateMerchantOrderStatus: vi.fn(async () => ({ ok: true, order: { id: 'order-1', status: 'paid' } }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: merchantAccountService(),
        orderService
      }
    });

    const headers = merchantAccountAuthHeader({ accountId: 'acct-admin' });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/merchant/orders?scope=history&fulfillmentMode=delivery',
          headers
        })
      ).statusCode
    ).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/orders/order-1', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: '/api/v1/merchant/orders/order-1/status', headers, payload: { status: 'paid' } })).statusCode).toBe(200);
    expect(orderService.queryMerchantOrders).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acct-admin' }),
      expect.objectContaining({ scope: 'history', fulfillmentMode: 'delivery' })
    );
    expect(orderService.getMerchantOrderDetail).toHaveBeenCalled();
    expect(orderService.updateMerchantOrderStatus).toHaveBeenCalled();
  });
});
