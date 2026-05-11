import { beforeEach, describe, expect, it, vi } from 'vitest';

import { startCustomerBootstrap } from './auth';
import { requestWechatPhone, submitManualPhone } from './phone';

describe('customer HTTP service response handling', () => {
  let apiRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    apiRequest = vi.fn();
  });

  it('requests customer bootstrap from the HTTP API', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      operation: 'create',
      user: { openid: 'user-openid' }
    });

    await expect(startCustomerBootstrap(apiRequest)).resolves.toEqual({
      ok: true,
      operation: 'create',
      user: { openid: 'user-openid' }
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/bootstrap', {
      method: 'POST',
      auth: 'customer'
    });
  });

  it('requests wechat phone binding from the HTTP API', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      update: {
        phoneBindingState: 'bound',
        contactPhoneMasked: '138****1234'
      }
    });

    await expect(
      requestWechatPhone({
        phoneNumber: '13800138123',
        countryCode: '+86'
      }, apiRequest)
    ).resolves.toEqual({
      ok: true,
      update: {
        phoneBindingState: 'bound',
        contactPhoneMasked: '138****1234'
      }
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/profile/phone', {
      method: 'POST',
      body: {
        payload: {
          phoneNumber: '13800138123',
          countryCode: '+86',
          source: 'wechat'
        }
      },
      auth: 'customer'
    });
  });

  it('passes the WeChat getPhoneNumber code to the profile phone API when no frontend phone number is returned', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      update: {
        phoneBindingState: 'bound',
        contactPhoneMasked: '138****1234'
      }
    });

    await expect(
      requestWechatPhone({
        code: 'wechat-phone-code'
      }, apiRequest)
    ).resolves.toEqual({
      ok: true,
      update: {
        phoneBindingState: 'bound',
        contactPhoneMasked: '138****1234'
      }
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/profile/phone', {
      method: 'POST',
      body: {
        phoneCode: 'wechat-phone-code'
      },
      auth: 'customer'
    });
  });

  it('normalizes manual phone submission before calling the profile phone API', async () => {
    apiRequest.mockResolvedValue({
      ok: true
    });

    await expect(
      submitManualPhone({
        phoneNumber: '138 0013 8123',
        countryCode: '86'
      }, apiRequest)
    ).resolves.toEqual({
      ok: true
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/profile/phone', {
      method: 'POST',
      body: {
        payload: {
          phoneNumber: '13800138123',
          countryCode: '+86',
          source: 'manual',
          phoneBindingState: 'bound',
          contactPhoneMasked: '',
          contactPhoneCountryCode: '+86'
        }
      },
      auth: 'customer'
    });
  });
});
