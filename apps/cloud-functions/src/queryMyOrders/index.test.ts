import { describe, expect, it } from 'vitest';

import { main } from './index';

describe('queryMyOrders cloud function', () => {
  it('returns only the current user orders sorted newest first', async () => {
    const result = await main(
      {},
      { OPENID: 'user-openid' },
      {
        listOrdersByOpenid: async (openid: string) => [
          {
            id: 'order-older',
            openid,
            status: 'pending_payment',
            paymentMethod: 'balance',
            payment: { method: 'balance', status: 'pending' },
            pricing: { itemsSubtotal: 58, deliveryFee: 10, payableTotal: 68 },
            snapshot: {
              fulfillment: {
                mode: 'delivery',
                store: { name: '虾衣宠物烘焙工作室', address: '上海市静安区南京西路 1266 号 8 楼' }
              },
              items: [],
              pets: [],
              remark: ''
            },
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          },
          {
            id: 'order-newer',
            openid,
            status: 'paid',
            paymentMethod: 'balance',
            payment: { method: 'balance', status: 'paid' },
            pricing: { itemsSubtotal: 58, deliveryFee: 10, payableTotal: 68 },
            snapshot: {
              fulfillment: {
                mode: 'delivery',
                store: { name: '虾衣宠物烘焙工作室', address: '上海市静安区南京西路 1266 号 8 楼' }
              },
              items: [],
              pets: [],
              remark: ''
            },
            createdAt: '2026-04-17T10:00:00.000Z',
            updatedAt: '2026-04-17T10:00:00.000Z'
          }
        ]
      }
    );

    expect(result.orders.map((item) => item.id)).toEqual(['order-newer', 'order-older']);
  });
});
