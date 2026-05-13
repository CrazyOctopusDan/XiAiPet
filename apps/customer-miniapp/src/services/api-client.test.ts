import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CUSTOMER_SESSION_STORAGE_KEY,
  CustomerApiError,
  clearCustomerSession,
  customerApiRequest,
  getCustomerSession
} from './api-client';
import {
  CUSTOMER_API_DEVELOPMENT_BASE_URL,
  CUSTOMER_API_PRODUCTION_BASE_URL,
  getCustomerApiBaseUrl
} from './api-config';

describe('customer API client', () => {
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
    delete (globalThis as Record<string, unknown>).__XIAIPET_CUSTOMER_API_BASE_URL__;
    vi.unstubAllGlobals();
  });

  it('logs in with wx.login and sends a bearer token on customer requests', async () => {
    requestMock
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 200,
          data: {
            ok: true,
            token: 'customer-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
            openid: 'openid-1'
          }
        })
      )
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 200,
          data: {
            ok: true,
            operation: 'restore',
            user: {
              openid: 'openid-1'
            }
          }
        })
      );

    await expect(
      customerApiRequest('/api/v1/customer/bootstrap', {
        method: 'POST'
      })
    ).resolves.toMatchObject({
      ok: true,
      operation: 'restore'
    });

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: 'http://118.178.173.241/api/v1/customer/auth/login',
        method: 'POST',
        data: {
          code: 'wx-login-code'
        }
      })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: 'http://118.178.173.241/api/v1/customer/bootstrap',
        data: {},
        header: expect.objectContaining({
          Authorization: 'Bearer customer-token',
          'content-type': 'application/json'
        })
      })
    );
    expect(getCustomerSession()).toMatchObject({
      token: 'customer-token',
      openid: 'openid-1'
    });
  });

  it('re-logins and retries the original request once after a 401', async () => {
    storage.set(CUSTOMER_SESSION_STORAGE_KEY, {
      token: 'expired-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      openid: 'openid-1'
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
            expiresAt: '2099-01-01T00:00:00.000Z',
            openid: 'openid-1'
          }
        })
      )
      .mockImplementationOnce((options) =>
        options.success({
          statusCode: 200,
          data: {
            ok: true,
            operation: 'restore'
          }
        })
      );

    await expect(
      customerApiRequest('/api/v1/customer/bootstrap', {
        method: 'POST'
      })
    ).resolves.toMatchObject({
      ok: true,
      operation: 'restore'
    });

    expect(requestMock).toHaveBeenCalledTimes(3);
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        header: expect.objectContaining({
          Authorization: 'Bearer fresh-token'
        })
      })
    );
  });

  it('normalizes API failures into CustomerApiError', async () => {
    requestMock.mockImplementationOnce((options) =>
      options.success({
        statusCode: 500,
        data: {
          ok: false,
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      })
    );

    await expect(
      customerApiRequest('/api/v1/customer/runtime-config', {
        auth: 'none'
      })
    ).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      message: 'Internal server error'
    } satisfies Partial<CustomerApiError>);
  });

  it('uses api.xiaipet.vip for release builds and allows local override cleanup', () => {
    vi.stubGlobal('wx', {
      getAccountInfoSync: vi.fn(() => ({
        miniProgram: {
          envVersion: 'release'
        }
      }))
    });

    expect(getCustomerApiBaseUrl()).toBe(CUSTOMER_API_PRODUCTION_BASE_URL);

    (globalThis as Record<string, unknown>).__XIAIPET_CUSTOMER_API_BASE_URL__ =
      'https://temporary-api.example.com/';
    expect(getCustomerApiBaseUrl()).toBe('https://temporary-api.example.com');

    clearCustomerSession();
  });

  it('uses the Alibaba ECS API for development builds', () => {
    expect(CUSTOMER_API_DEVELOPMENT_BASE_URL).toBe('http://118.178.173.241');
    expect(getCustomerApiBaseUrl()).toBe('http://118.178.173.241');
  });
});
