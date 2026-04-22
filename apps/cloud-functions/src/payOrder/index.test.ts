import { describe, expect, it } from 'vitest';

import type { OrderRecord } from '@xiaipet/shared';

import { main } from './index';
import type { PaymentStore } from '../shared/payment-store';

function createOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order-001',
    openid: 'user-openid',
    status: 'pending_payment',
    idempotencyKey: 'checkout-20260417-001',
    paymentMethod: 'balance',
    payment: {
      method: 'balance',
      status: 'pending'
    },
    pricing: {
      itemsSubtotal: 116,
      deliveryFee: 12,
      payableTotal: 128
    },
    snapshot: {
      fulfillment: {
        mode: 'delivery',
        address: {
          recipientName: '虾衣妈妈',
          phoneNumber: '13800001234',
          regionLabel: '上海市 静安区',
          detailAddress: '南京西路 1266 号 8 楼',
          tag: '家'
        },
        reservation: {
          dateValue: '2026-04-17',
          dateLabel: '今天 04-17',
          timeValue: '10:30',
          timeLabel: '10:30'
        },
        store: {
          name: '虾衣宠物烘焙工作室',
          address: '上海市静安区南京西路 1266 号 8 楼'
        }
      },
      items: [
        {
          productId: 'ocean-party',
          name: '海洋派对蛋糕',
          quantity: 2,
          unitPrice: 58,
          lineTotal: 116,
          specId: 'party-6inch',
          specLabel: '6 寸'
        }
      ],
      pets: [],
      remark: '少糖'
    },
    createdAt: '2026-04-17T10:10:10.000Z',
    updatedAt: '2026-04-17T10:10:10.000Z',
    ...overrides
  };
}

describe('payOrder cloud function', () => {
  it('marks a balance order as paid and returns the final order', async () => {
    const order = createOrder();
    const repository: PaymentStore = {
      getOrderById: async () => order,
      saveOrder: async (nextOrder: OrderRecord) => nextOrder,
      listOrdersByOpenid: async () => [],
      finalizeBalancePayment: async (nextOrder: OrderRecord) => ({
        order: {
          ...nextOrder,
          status: 'paid',
          payment: {
            method: 'balance',
            status: 'paid'
          }
        },
        balanceAfter: 140
      }),
      getWechatPayConfig: async () => ({ enabled: false })
    };

    const result = await main({ orderId: 'order-001' }, { OPENID: 'user-openid' }, repository);

    expect(result).toMatchObject({
      ok: true,
      paymentStatus: 'paid',
      order: {
        id: 'order-001',
        status: 'paid',
        payment: {
          status: 'paid'
        }
      }
    });
  });

  it('returns insufficient balance without mutating the order', async () => {
    const repository: PaymentStore = {
      getOrderById: async () => createOrder(),
      saveOrder: async (nextOrder: OrderRecord) => nextOrder,
      listOrdersByOpenid: async () => [],
      finalizeBalancePayment: async () => ({
        error: 'INSUFFICIENT_BALANCE' as const
      }),
      getWechatPayConfig: async () => ({ enabled: false })
    };

    const result = await main({ orderId: 'order-001' }, { OPENID: 'user-openid' }, repository);

    expect(result).toMatchObject({
      ok: false,
      code: 'INSUFFICIENT_BALANCE'
    });
  });

  it('returns not-configured for wechat pay without live credentials', async () => {
    const repository: PaymentStore = {
      getOrderById: async () =>
        createOrder({
          paymentMethod: 'wechat',
          payment: {
            method: 'wechat',
            status: 'pending'
          }
        }),
      saveOrder: async (nextOrder: OrderRecord) => nextOrder,
      listOrdersByOpenid: async () => [],
      finalizeBalancePayment: async () => ({
        error: 'INSUFFICIENT_BALANCE' as const
      }),
      getWechatPayConfig: async () => ({ enabled: false })
    };

    const result = await main({ orderId: 'order-001' }, { OPENID: 'user-openid' }, repository);

    expect(result).toMatchObject({
      ok: false,
      code: 'WECHAT_PAY_NOT_CONFIGURED',
      order: {
        status: 'pending_payment'
      }
    });
  });
});
