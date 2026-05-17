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

describe('merchant printing routes', () => {
  it('routes prepare and result calls for allowed merchants', async () => {
    const printingService = {
      prepareOrderReceiptPrint: vi.fn(async () => ({ ok: true, print: { orderId: 'order-1' } })),
      recordOrderReceiptPrintResult: vi.fn(async () => ({ ok: true, audit: { id: 'audit-1' } }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: merchantAccountService(),
        printingService
      }
    });

    const headers = merchantAccountAuthHeader({ accountId: 'acct-admin' });
    expect((await app.inject({ method: 'POST', url: '/api/v1/merchant/orders/order-1/receipt-print/prepare', headers, payload: {} })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/v1/merchant/orders/order-1/receipt-print/result', headers, payload: { result: 'success' } })).statusCode).toBe(200);
    expect(printingService.prepareOrderReceiptPrint).toHaveBeenCalled();
    expect(printingService.recordOrderReceiptPrintResult).toHaveBeenCalled();
  });

  it('rejects denied merchants before printing service call', async () => {
    const prepareOrderReceiptPrint = vi.fn(async () => ({ ok: true }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: merchantAccountService({ mustChangePassword: true }),
        printingService: {
          prepareOrderReceiptPrint,
          recordOrderReceiptPrintResult: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/orders/order-1/receipt-print/prepare',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin', mustChangePassword: true }),
      payload: {}
    });
    expect(response.statusCode).toBe(403);
    expect(prepareOrderReceiptPrint).not.toHaveBeenCalled();
  });
});
