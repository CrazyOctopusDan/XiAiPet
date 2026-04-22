import { describe, expect, it } from 'vitest';

import { main } from './index';

describe('getMyOrderDetail cloud function', () => {
  it('returns the owned order detail', async () => {
    const result = await main(
      { orderId: 'order-001' },
      { OPENID: 'user-openid' },
      {
        getOrderById: async () => ({
          id: 'order-001',
          openid: 'user-openid',
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
        })
      }
    );

    expect(result.order.id).toBe('order-001');
  });

  it('rejects access to someone else order', async () => {
    await expect(
      main(
        { orderId: 'order-001' },
        { OPENID: 'user-openid' },
        {
          getOrderById: async () => ({
            id: 'order-001',
            openid: 'another-user',
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
          })
        }
      )
    ).rejects.toThrow('ORDER_FORBIDDEN');
  });
});
