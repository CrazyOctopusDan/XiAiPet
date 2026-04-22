import { beforeEach, describe, expect, it, vi } from 'vitest';

import { startCustomerBootstrap } from './auth';
import { requestWechatPhone, submitManualPhone } from './phone';

describe('cloud service response handling', () => {
  let loginMock: ReturnType<typeof vi.fn>;
  let callFunctionMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loginMock = vi.fn().mockResolvedValue({ code: 'login-code' });
    callFunctionMock = vi.fn();

    vi.stubGlobal('wx', {
      login: loginMock,
      cloud: {
        callFunction: callFunctionMock
      }
    });
  });

  it('unwraps the business result from customer bootstrap', async () => {
    callFunctionMock.mockResolvedValue({
      result: {
        ok: true,
        operation: 'create',
        user: { openid: 'user-openid' }
      }
    });

    await expect(startCustomerBootstrap()).resolves.toEqual({
      ok: true,
      operation: 'create',
      user: { openid: 'user-openid' }
    });

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(callFunctionMock).toHaveBeenCalledWith({
      name: 'bootstrapUser',
      data: {
        code: 'login-code'
      }
    });
  });

  it('unwraps the business result from wechat phone binding', async () => {
    callFunctionMock.mockResolvedValue({
      result: {
        ok: true,
        update: {
          phoneBindingState: 'bound',
          contactPhoneMasked: '138****1234'
        }
      }
    });

    await expect(
      requestWechatPhone({
        phoneNumber: '13800138123',
        countryCode: '+86'
      })
    ).resolves.toEqual({
      ok: true,
      update: {
        phoneBindingState: 'bound',
        contactPhoneMasked: '138****1234'
      }
    });
  });

  it('normalizes manual phone submission before calling the cloud function', async () => {
    callFunctionMock.mockResolvedValue({
      result: {
        ok: true
      }
    });

    await expect(
      submitManualPhone({
        phoneNumber: '138 0013 8123',
        countryCode: '86'
      })
    ).resolves.toEqual({
      ok: true
    });

    expect(callFunctionMock).toHaveBeenCalledWith({
      name: 'bindPhone',
      data: {
        payload: {
          phoneNumber: '13800138123',
          countryCode: '+86',
          source: 'manual',
          phoneBindingState: 'bound',
          contactPhoneMasked: '',
          contactPhoneCountryCode: '+86'
        }
      }
    });
  });
});
