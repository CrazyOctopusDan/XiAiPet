import { describe, expect, it, vi } from 'vitest';

import { createWechatSubscriptionMessageSender } from './wechat-sender';

describe('createWechatSubscriptionMessageSender', () => {
  it('maps new-order data to the configured WeChat template keyword ids', async () => {
    const requests: Array<{ url: string; body?: unknown }> = [];
    const fetchImpl = vi.fn(async (url: URL | string, init?: RequestInit) => {
      requests.push({
        url: String(url),
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      if (String(url).includes('/cgi-bin/token')) {
        return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 7200 }), { status: 200 });
      }

      return new Response(JSON.stringify({ errcode: 0, errmsg: 'ok' }), { status: 200 });
    });

    const sender = createWechatSubscriptionMessageSender({
      merchantWechatAppId: 'merchant-app-id',
      merchantWechatAppSecret: 'merchant-secret'
    }, fetchImpl as typeof fetch);

    await sender.sendNewOrderMessage({
      touser: 'openid-1',
      orderId: 'order-1782826405372',
      customerName: '顾客',
      itemQuantity: 3,
      payableTotal: 88.8,
      paidAt: '2026-06-30T13:33:26.916Z'
    });

    const sendRequest = requests.find((request) => request.url.includes('/message/subscribe/send'));
    expect(sendRequest?.body).toMatchObject({
      touser: 'openid-1',
      template_id: 'tTJBDAEzr5FVXraGKu75bwi5RqMD3ewsmpYqE926u8M',
      data: {
        character_string1: { value: 'order-1782826405372' },
        thing2: { value: '顾客' },
        thing6: { value: '3件' },
        amount7: { value: '￥88.80' },
        time21: { value: '2026-06-30 21:33' }
      }
    });
    expect((sendRequest?.body as { data?: Record<string, unknown> }).data).not.toHaveProperty('number3');
    expect((sendRequest?.body as { data?: Record<string, unknown> }).data).not.toHaveProperty('amount4');
    expect((sendRequest?.body as { data?: Record<string, unknown> }).data).not.toHaveProperty('time5');
  });
});
