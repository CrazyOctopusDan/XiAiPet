import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MERCHANT_SESSION_STORAGE_KEY,
  MerchantApiError,
  changeMerchantPassword,
  getMerchantSession,
  merchantApiRequest,
  merchantLogin
} from './api-client';
import {
  MERCHANT_API_DEVELOPMENT_BASE_URL,
  MERCHANT_API_PRODUCTION_BASE_URL,
  getMerchantApiBaseUrl
} from './api-config';

describe('merchant API client', () => {
  const storage = new Map<string, unknown>();
  let requestMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage.clear();
    requestMock = vi.fn();

    vi.stubGlobal('wx', {
      request: requestMock,
      getStorageSync: vi.fn((key: string) => storage.get(key)),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
      removeStorageSync: vi.fn((key: string) => storage.delete(key)),
      getAccountInfoSync: vi.fn(() => ({
        miniProgram: {
          envVersion: 'develop'
        }
      }))
    });
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__XIAIPET_MERCHANT_API_BASE_URL__;
    vi.unstubAllGlobals();
  });

  it('logs in with account password and sends a bearer token on merchant requests', async () => {
    requestMock
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 200,
          data: {
            ok: true,
            token: 'merchant-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
            account: {
              id: 'acct-admin',
              username: 'admin',
              role: 'admin',
              mustChangePassword: true
            }
          }
        })
      )
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 200,
          data: {
            ok: true,
            groups: []
          }
        })
      );

    await expect(merchantLogin({ username: 'admin', password: 'admin' })).resolves.toMatchObject({
      token: 'merchant-token',
      account: {
        username: 'admin',
        role: 'admin',
        mustChangePassword: true
      }
    });
    await expect(merchantApiRequest('/api/v1/merchant/orders')).resolves.toEqual({
      ok: true,
      groups: []
    });

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: 'http://118.178.173.241/api/v1/merchant/auth/login',
        method: 'POST',
        data: {
          username: 'admin',
          password: 'admin'
        }
      })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: 'http://118.178.173.241/api/v1/merchant/orders',
        header: expect.objectContaining({
          Authorization: 'Bearer merchant-token'
        })
      })
    );
    expect(requestMock.mock.calls[1][0].header).not.toHaveProperty('content-type');
    expect(getMerchantSession()).toMatchObject({
      token: 'merchant-token',
      account: {
        id: 'acct-admin'
      }
    });
  });

  it('sends an empty JSON object for no-body mutating requests', async () => {
    storage.set(MERCHANT_SESSION_STORAGE_KEY, {
      token: 'merchant-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      account: {
        id: 'acct-admin',
        username: 'admin',
        role: 'admin',
        mustChangePassword: false
      }
    });
    requestMock.mockImplementationOnce((options) =>
      options.success({
        statusCode: 200,
        data: {
          ok: true
        }
      })
    );

    await expect(
      merchantApiRequest('/api/v1/merchant/orders/order-1/receipt-print/prepare', {
        method: 'POST'
      })
    ).resolves.toEqual({
      ok: true
    });

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        data: {},
        header: expect.objectContaining({
          Authorization: 'Bearer merchant-token',
          'content-type': 'application/json'
        })
      })
    );
  });

  it('normalizes API errors into MerchantApiError', async () => {
    requestMock.mockImplementationOnce((options) =>
      options.success({
        statusCode: 403,
        data: {
          ok: false,
          code: 'MERCHANT_FORBIDDEN',
          message: '当前账号没有商户权限'
        }
      })
    );

    await expect(
      merchantApiRequest('/api/v1/merchant/access', {
        auth: 'none'
      })
    ).rejects.toMatchObject({
      code: 'MERCHANT_FORBIDDEN',
      statusCode: 403
    } satisfies Partial<MerchantApiError>);
  });

  it('rejects unsupported auth modes', async () => {
    await expect(
      merchantApiRequest('/api/v1/merchant/access', {
        auth: 'customer' as never
      })
    ).rejects.toMatchObject({
      code: 'INVALID_AUTH_MODE',
      statusCode: 400
    } satisfies Partial<MerchantApiError>);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('clears stored session and does not auto re-login after a 401 response', async () => {
    storage.set(MERCHANT_SESSION_STORAGE_KEY, {
      token: 'expired-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      account: {
        id: 'acct-admin',
        username: 'admin',
        role: 'admin',
        mustChangePassword: false
      }
    });

    requestMock.mockImplementationOnce((options) =>
      options.success({
        statusCode: 401,
        data: {
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'Invalid session'
        }
      })
    );

    await expect(merchantApiRequest('/api/v1/merchant/orders')).rejects.toMatchObject({
      code: 'UNAUTHORIZED'
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(storage.has(MERCHANT_SESSION_STORAGE_KEY)).toBe(false);
  });

  it('changes merchant password and stores the refreshed session', async () => {
    storage.set(MERCHANT_SESSION_STORAGE_KEY, {
      token: 'merchant-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      account: {
        id: 'acct-admin',
        username: 'admin',
        role: 'admin',
        mustChangePassword: true
      }
    });
    requestMock.mockImplementationOnce((options) =>
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          token: 'fresh-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          account: {
            id: 'acct-admin',
            username: 'admin',
            role: 'admin',
            mustChangePassword: false
          }
        }
      })
    );

    await expect(changeMerchantPassword({ currentPassword: 'admin', newPassword: 'newpass' })).resolves.toMatchObject({
      token: 'fresh-token',
      account: {
        mustChangePassword: false
      }
    });
    expect(getMerchantSession()).toMatchObject({
      token: 'fresh-token',
      account: {
        mustChangePassword: false
      }
    });
  });

  it('uses api.xiaipet.vip for release builds and supports local override', () => {
    vi.stubGlobal('wx', {
      getAccountInfoSync: vi.fn(() => ({
        miniProgram: {
          envVersion: 'release'
        }
      }))
    });

    expect(getMerchantApiBaseUrl()).toBe(MERCHANT_API_PRODUCTION_BASE_URL);

    (globalThis as Record<string, unknown>).__XIAIPET_MERCHANT_API_BASE_URL__ =
      'https://temporary-merchant.example.com/';
    expect(getMerchantApiBaseUrl()).toBe('https://temporary-merchant.example.com');
  });

  it('uses the Alibaba ECS API for development builds', () => {
    expect(MERCHANT_API_DEVELOPMENT_BASE_URL).toBe('http://118.178.173.241');
    expect(getMerchantApiBaseUrl()).toBe('http://118.178.173.241');
  });
});
