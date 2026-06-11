import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { testConfig } from './test-helpers';

describe('payment routes', () => {
  it('accepts WeChat Pay notifications without customer authentication', async () => {
    const paymentNotifyService = {
      handleWechatPayNotification: vi.fn(async () => ({ ok: true }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        paymentNotifyService
      }
    });
    const payload = JSON.stringify({
      id: 'notice-1',
      resource: {
        ciphertext: 'encrypted',
        nonce: 'nonce',
        associated_data: 'transaction'
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/wechat/notify',
      headers: {
        'content-type': 'application/json',
        'wechatpay-timestamp': '1700000000',
        'wechatpay-nonce': 'nonce-value',
        'wechatpay-serial': 'platform-serial',
        'wechatpay-signature': 'signature-value'
      },
      payload
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ code: 'SUCCESS', message: '成功' });
    expect(paymentNotifyService.handleWechatPayNotification).toHaveBeenCalledWith({
      rawBody: payload,
      headers: {
        timestamp: '1700000000',
        nonce: 'nonce-value',
        serial: 'platform-serial',
        signature: 'signature-value'
      }
    });
  });
});
