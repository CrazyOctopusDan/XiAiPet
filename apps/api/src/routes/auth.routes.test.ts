import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { authHeader, merchantAccountAuthHeader, testConfig } from './test-helpers';

describe('auth and identity routes', () => {
  it('logs in with wx code and returns a session token', async () => {
    const app = buildApp({
      config: testConfig,
      dependencies: {
        customerWechatLoginProvider: {
          exchangeLoginCode: async () => ({ openid: 'openid-login' })
        }
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/auth/login',
      payload: { code: 'wx-code' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, openid: 'openid-login' });
    expect(response.json().token).toEqual(expect.any(String));
  });

  it('uses customer WeChat login and merchant account password login separately', async () => {
    const customerExchangeLoginCode = vi.fn(async () => ({ openid: 'customer-provider-openid' }));
    const merchantLogin = vi.fn(async () => ({
      ok: true as const,
      account: {
        id: 'acct-admin',
        username: 'admin',
        passwordHash: 'hidden',
        role: 'admin' as const,
        status: 'active' as const,
        mustChangePassword: true,
        createdBy: null,
        lastLoginAt: null,
        createdAt: new Date('2026-05-13T00:00:00.000Z'),
        updatedAt: new Date('2026-05-13T00:00:00.000Z')
      }
    }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        customerWechatLoginProvider: {
          exchangeLoginCode: customerExchangeLoginCode
        },
        merchantAccountService: {
          bootstrapInitialAdmin: async () => ({ ok: true }),
          login: merchantLogin,
          getActiveAccount: async () => merchantLogin.mock.results[0].value.then((result) => result.account),
          changePassword: async () => merchantLogin.mock.results[0].value.then((result) => result.account).then((account) => ({ ok: true as const, account })),
          listAccounts: async () => ({ ok: true, accounts: [] }),
          createStaffAccount: async () => ({ ok: true }),
          disableStaffAccount: async () => ({ ok: true }),
          resetStaffPassword: async () => ({ ok: true })
        }
      }
    });

    const customerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/auth/login',
      payload: { code: 'customer-wx-code' }
    });
    const merchantResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/auth/login',
      payload: { username: 'admin', password: 'admin' }
    });

    expect(customerResponse.statusCode).toBe(200);
    expect(customerResponse.json()).toMatchObject({ ok: true, openid: 'customer-provider-openid' });
    expect(merchantResponse.statusCode).toBe(200);
    expect(merchantResponse.json()).toMatchObject({
      ok: true,
      account: {
        id: 'acct-admin',
        username: 'admin',
        role: 'admin',
        mustChangePassword: true
      }
    });
    expect(customerExchangeLoginCode).toHaveBeenCalledWith('customer-wx-code');
    expect(merchantLogin).toHaveBeenCalledWith({ username: 'admin', password: 'admin' });
  });

  it('changes merchant password through merchant account session', async () => {
    const account = {
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
    const changePassword = vi.fn(async () => ({ ok: true as const, account }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        merchantAccountService: {
          bootstrapInitialAdmin: async () => ({ ok: true }),
          login: async () => ({ ok: true, account }),
          getActiveAccount: async () => ({ ...account, mustChangePassword: true }),
          changePassword,
          listAccounts: async () => ({ ok: true, accounts: [] }),
          createStaffAccount: async () => ({ ok: true }),
          disableStaffAccount: async () => ({ ok: true }),
          resetStaffPassword: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/auth/change-password',
      headers: merchantAccountAuthHeader({ mustChangePassword: true }),
      payload: { currentPassword: 'admin', newPassword: 'newpass' }
    });

    expect(response.statusCode).toBe(200);
    expect(changePassword).toHaveBeenCalledWith('acct-admin', { currentPassword: 'admin', newPassword: 'newpass' });
    expect(response.json()).toMatchObject({ ok: true, account: { mustChangePassword: false } });
  });

  it('rejects missing customer session', async () => {
    const app = buildApp({ config: testConfig });
    const response = await app.inject({ method: 'POST', url: '/api/v1/customer/bootstrap' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('uses session openid for bootstrap and ignores body openid', async () => {
    const bootstrapUser = vi.fn(async (openid: string) => ({ ok: true, operation: 'created', user: { openid }, skippedCollections: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser,
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({ ok: true, status: 'denied', allowed: false })
        }
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/bootstrap',
      headers: authHeader('session-openid'),
      payload: { openid: 'body-openid' }
    });

    expect(response.statusCode).toBe(200);
    expect(bootstrapUser).toHaveBeenCalledWith('session-openid');
  });

  it('binds phone through customer session', async () => {
    const bindPhone = vi.fn(async (openid: string) => ({ ok: true, openid, update: { phoneBindingState: 'bound' } }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone,
          assertMerchantAccess: async () => ({ ok: true, status: 'denied', allowed: false })
        }
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/profile/phone',
      headers: authHeader('phone-openid'),
      payload: { phoneNumber: '13800138000', countryCode: '+86', source: 'manual' }
    });

    expect(response.statusCode).toBe(200);
    expect(bindPhone).toHaveBeenCalledWith('phone-openid', expect.any(Object));
  });

  it('returns merchant allowed and rejects merchant routes before sensitive service call', async () => {
    const queryMerchantOrders = vi.fn(async () => ({ ok: true, orders: [] }));
    const allowedApp = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({
            ok: true,
            status: 'allowed',
            allowed: true,
            merchant: { merchantId: 'm1', storeName: 'store' }
          })
        },
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
    const accessResponse = await allowedApp.inject({
      method: 'GET',
      url: '/api/v1/merchant/access',
      headers: authHeader('merchant-openid', 'merchant')
    });
    expect(accessResponse.json()).toMatchObject({ ok: true, status: 'allowed', allowed: true });

    const deniedApp = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({ ok: true, status: 'denied', allowed: false, reason: 'denied' })
        },
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
    const deniedResponse = await deniedApp.inject({
      method: 'GET',
      url: '/api/v1/merchant/orders',
      headers: authHeader('not-merchant', 'merchant')
    });
    expect(deniedResponse.statusCode).toBe(403);
    expect(queryMerchantOrders).not.toHaveBeenCalled();
  });

  it('rejects customer tokens on merchant routes and merchant tokens on customer routes', async () => {
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({
            ok: true,
            status: 'allowed',
            allowed: true,
            merchant: { merchantId: 'm1', storeName: 'store' }
          })
        }
      }
    });

    const merchantWithCustomerToken = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/access',
      headers: authHeader('merchant-openid', 'customer')
    });
    expect(merchantWithCustomerToken.statusCode).toBe(401);

    const customerWithMerchantToken = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/bootstrap',
      headers: authHeader('customer-openid', 'merchant')
    });
    expect(customerWithMerchantToken.statusCode).toBe(401);
  });
});
