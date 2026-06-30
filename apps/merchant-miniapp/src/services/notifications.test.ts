import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID,
  enableNewOrderSubscription
} from './notifications';

describe('merchant notification subscription service', () => {
  let requestSubscribeMessage: ReturnType<typeof vi.fn>;
  let login: ReturnType<typeof vi.fn>;
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestSubscribeMessage = vi.fn();
    login = vi.fn();
    request = vi.fn();

    vi.stubGlobal('wx', {
      requestSubscribeMessage,
      login,
      request,
      getStorageSync: vi.fn(() => ({
        token: 'merchant-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
        account: {
          id: 'acct-admin',
          username: 'admin',
          role: 'admin',
          mustChangePassword: false
        }
      })),
      getAccountInfoSync: vi.fn(() => ({
        miniProgram: { envVersion: 'develop' }
      }))
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the new-order template, logs in, and binds the current WeChat receiver', async () => {
    requestSubscribeMessage.mockImplementationOnce((options) =>
      options.success({
        [NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID]: 'accept'
      })
    );
    login.mockImplementationOnce((options) =>
      options.success({
        code: 'merchant-wx-code'
      })
    );
    request.mockImplementationOnce((options) =>
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          subscriber: {
            openid: 'openid-owner'
          }
        }
      })
    );

    await expect(enableNewOrderSubscription()).resolves.toEqual({
      ok: true,
      status: 'enabled'
    });

    expect(requestSubscribeMessage).toHaveBeenCalledWith(expect.objectContaining({
      tmplIds: [NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID]
    }));
    expect(login).toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://api.xiaipet.vip/api/v1/merchant/notifications/new-order-subscription',
      method: 'POST',
      data: {
        code: 'merchant-wx-code',
        templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
      },
      header: expect.objectContaining({
        Authorization: 'Bearer merchant-token'
      })
    }));
  });

  it('does not bind the receiver when the user rejects the template', async () => {
    requestSubscribeMessage.mockImplementationOnce((options) =>
      options.success({
        [NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID]: 'reject'
      })
    );

    await expect(enableNewOrderSubscription()).resolves.toEqual({
      ok: false,
      status: 'rejected'
    });
    expect(login).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
