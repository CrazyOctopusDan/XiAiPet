import { describe, expect, it } from 'vitest';

import { main } from './index';

describe('createPayment cloud function', () => {
  it('returns mocked wechat payment params for wechat payments', async () => {
    const result = await main({
      order: {
        id: 'order-001',
        pricing: {
          payableTotal: 88
        }
      },
      paymentMethod: 'wechat',
      customerBalance: 268
    });

    expect(result).toMatchObject({
      ok: true,
      paymentStatus: 'pending_wechat',
      paymentParams: expect.objectContaining({
        nonceStr: expect.any(String)
      })
    });
  });

  it('blocks balance payment when customer balance is insufficient', async () => {
    const result = await main({
      order: {
        id: 'order-002',
        pricing: {
          payableTotal: 320
        }
      },
      paymentMethod: 'balance',
      customerBalance: 100
    });

    expect(result).toEqual({
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      paymentStatus: 'blocked'
    });
  });
});
