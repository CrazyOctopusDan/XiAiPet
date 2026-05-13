import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MERCHANT_SESSION_STORAGE_KEY,
  MerchantApiError,
  merchantApiRequest,
  getMerchantSession
} from './api-client';
import {
  MERCHANT_API_DEVELOPMENT_BASE_URL,
  MERCHANT_API_PRODUCTION_BASE_URL,
  getMerchantApiBaseUrl
} from './api-config';

describe('merchant API client', () => {
  const storage = new Map<string, unknown>();
  let loginMock: ReturnType<typeof vi.fn>;
  let requestMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage.clear();
    loginMock = vi.fn().mockResolvedValue({ code: 'wx-login-code' });
    requestMock = vi.fn();

    vi.stubGlobal('wx', {
      login: loginMock,
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

  it('logs in and sends a bearer token on merchant requests', async () => {
    requestMock
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 200,
          data: {
            ok: true,
            token: 'merchant-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
            openid: 'merchant-openid'
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

    await expect(merchantApiRequest('/api/v1/merchant/orders')).resolves.toEqual({
      ok: true,
      groups: []
    });

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: 'http://118.178.173.241/api/v1/merchant/auth/login',
        method: 'POST',
        data: {
          code: 'wx-login-code'
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
      openid: 'merchant-openid'
    });
  });

  it('sends an empty JSON object for no-body mutating requests', async () => {
    storage.set(MERCHANT_SESSION_STORAGE_KEY, {
      token: 'merchant-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      openid: 'merchant-openid'
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
          message: '当前账号还未加入 merchant_users 白名单'
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
    expect(loginMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('re-logins and retries once after a 401 response', async () => {
    storage.set(MERCHANT_SESSION_STORAGE_KEY, {
      token: 'expired-token',
      expiresAt: '2099-01-01T00:00:00.000Z'
    });

    requestMock
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 401,
          data: {
            ok: false,
            code: 'UNAUTHORIZED',
            message: 'Invalid session'
          }
        })
      )
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 200,
          data: {
            ok: true,
            token: 'fresh-token',
            expiresAt: '2099-01-01T00:00:00.000Z'
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

    await expect(merchantApiRequest('/api/v1/merchant/orders')).resolves.toEqual({
      ok: true,
      groups: []
    });

    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        header: expect.objectContaining({
          Authorization: 'Bearer fresh-token'
        })
      })
    );
  });

  it('clears stored session when re-login fails', async () => {
    storage.set(MERCHANT_SESSION_STORAGE_KEY, {
      token: 'expired-token',
      expiresAt: '2099-01-01T00:00:00.000Z'
    });

    requestMock
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 401,
          data: {
            ok: false,
            code: 'UNAUTHORIZED',
            message: 'Invalid session'
          }
        })
      )
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 400,
          data: {
            ok: false,
            code: 'INVALID_LOGIN_CODE',
            message: 'wx.login code is required'
          }
        })
      );

    await expect(merchantApiRequest('/api/v1/merchant/orders')).rejects.toMatchObject({
      code: 'INVALID_LOGIN_CODE'
    });
    expect(storage.has(MERCHANT_SESSION_STORAGE_KEY)).toBe(false);
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
