import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID } from '../modules/merchant-notifications/service';
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

describe('merchant notification routes', () => {
  it('binds the current merchant account to a new-order subscription receiver', async () => {
    const merchantNotificationService = {
      enableNewOrderSubscription: vi.fn(async () => ({
        ok: true,
        subscriber: {
          openid: 'openid-owner',
          templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
        }
      })),
      notifyNewOrder: vi.fn(async () => ({ ok: true }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: merchantAccountService(),
        merchantNotificationService
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/notifications/new-order-subscription',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin' }),
      payload: {
        code: 'merchant-wx-code',
        templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
      }
    });

    expect(response.statusCode).toBe(200);
    expect(merchantNotificationService.enableNewOrderSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acct-admin', username: 'admin' }),
      {
        code: 'merchant-wx-code',
        templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
      }
    );
  });
});
