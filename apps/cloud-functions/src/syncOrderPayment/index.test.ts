import { describe, expect, it } from 'vitest';

import type { OrderRecord } from '@xiaipet/shared';

import { main } from './index';

function createOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order-001',
    openid: 'user-openid',
    status: 'payment_processing',
    paymentMethod: 'wechat',
    payment: {
      method: 'wechat',
      status: 'processing'
    },
    pricing: {
      itemsSubtotal: 116,
      deliveryFee: 12,
      payableTotal: 128
    },
    snapshot: {
      fulfillment: {
        mode: 'delivery',
        store: {
          name: '虾衣宠物烘焙工作室',
          address: '上海市静安区南京西路 1266 号 8 楼'
        }
      },
      items: [],
      pets: [],
      remark: ''
    },
    createdAt: '2026-04-17T10:10:10.000Z',
    updatedAt: '2026-04-17T10:10:10.000Z',
    ...overrides
  };
}

describe('syncOrderPayment cloud function', () => {
  it('does not mark wechat payment as successful without backend confirmation', async () => {
    const result = await main(
      { orderId: 'order-001' },
      { OPENID: 'user-openid' },
      {
        getOrderById: async () => createOrder(),
        saveOrder: async (order: OrderRecord) => order,
        getWechatPayConfig: async () => ({ enabled: false })
      }
    );

    expect(result.order.status).toBe('payment_processing');
  });

  it('returns paid without duplicate side effects when the order is already paid', async () => {
    const result = await main(
      { orderId: 'order-001' },
      { OPENID: 'user-openid' },
      {
        getOrderById: async () =>
          createOrder({
            status: 'paid',
            payment: {
              method: 'wechat',
              status: 'paid'
            }
          }),
        saveOrder: async (order: OrderRecord) => order,
        getWechatPayConfig: async () => ({ enabled: false })
      }
    );

    expect(result.order.status).toBe('paid');
  });
});
