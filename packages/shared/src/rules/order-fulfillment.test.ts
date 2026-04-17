import { describe, expect, it } from 'vitest';

import type { OrderRecord } from '../types/order';
import {
  canTransitionFulfillmentState,
  createManualSettlementRecord,
  getPaidFulfillmentChain
} from './order-fulfillment';

function createPaidOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order-merchant-001',
    openid: 'customer-openid',
    status: 'paid',
    paymentMethod: 'wechat',
    payment: {
      method: 'wechat',
      status: 'paid'
    },
    fulfillmentState: {
      mode: 'delivery',
      status: 'pending'
    },
    pricing: {
      itemsSubtotal: 98,
      deliveryFee: 10,
      payableTotal: 108
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
          quantity: 1,
          unitPrice: 98,
          lineTotal: 98,
          specId: 'party-4inch',
          specLabel: '4 寸'
        }
      ],
      pets: [],
      remark: ''
    },
    createdAt: '2026-04-17T09:30:00.000Z',
    updatedAt: '2026-04-17T09:35:00.000Z',
    ...overrides
  };
}

describe('order fulfillment rules', () => {
  it('maps delivery, pickup, and express orders to the exact paid fulfillment chains and merchant group labels', () => {
    expect(getPaidFulfillmentChain('delivery')).toEqual([
      { status: 'pending', label: '待处理', groupLabel: '待处理' },
      { status: 'in_production', label: '制作中', groupLabel: '制作中' },
      { status: 'out_for_delivery', label: '配送中', groupLabel: '配送中' },
      { status: 'completed', label: '已完成', groupLabel: '已完成' }
    ]);

    expect(getPaidFulfillmentChain('pickup')).toEqual([
      { status: 'pending', label: '待处理', groupLabel: '待处理' },
      { status: 'in_production', label: '制作中', groupLabel: '制作中' },
      { status: 'ready_for_pickup', label: '待自取', groupLabel: '待自取' },
      { status: 'completed', label: '已完成', groupLabel: '已完成' }
    ]);

    expect(getPaidFulfillmentChain('express')).toEqual([
      { status: 'pending', label: '待处理', groupLabel: '待处理' },
      { status: 'in_production', label: '制作中', groupLabel: '制作中' },
      { status: 'ready_to_ship', label: '待发货', groupLabel: '待发货' },
      { status: 'completed', label: '已完成', groupLabel: '已完成' }
    ]);
  });

  it('stores unpaid manual fallback as a dedicated audited subrecord without overwriting checkout payment selection', () => {
    const order: OrderRecord = createPaidOrder({
      status: 'pending_payment',
      payment: {
        method: 'wechat',
        status: 'pending'
      }
    });

    order.merchantOverride = {
      manualSettlement: createManualSettlementRecord({
        method: 'offline_collection',
        reasonNote: '门店现场已收款，补录支付结果',
        operator: {
          id: 'merchant-001',
          name: '店主小虾'
        },
        before: {
          orderStatus: 'pending_payment',
          paymentStatus: 'pending'
        },
        after: {
          orderStatus: 'paid',
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending'
        },
        settledAt: '2026-04-17T10:00:00.000Z'
      })
    };

    expect(order.paymentMethod).toBe('wechat');
    expect(order.merchantOverride?.manualSettlement).toEqual({
      method: 'offline_collection',
      reasonNote: '门店现场已收款，补录支付结果',
      operator: {
        id: 'merchant-001',
        name: '店主小虾'
      },
      before: {
        orderStatus: 'pending_payment',
        paymentStatus: 'pending'
      },
      after: {
        orderStatus: 'paid',
        paymentStatus: 'paid',
        fulfillmentStatus: 'pending'
      },
      settledAt: '2026-04-17T10:00:00.000Z'
    });
  });

  it('keeps terminal fulfillment states immutable once entered', () => {
    expect(
      canTransitionFulfillmentState({
        mode: 'delivery',
        currentStatus: 'completed',
        nextStatus: 'in_production'
      })
    ).toBe(false);

    expect(
      canTransitionFulfillmentState({
        mode: 'pickup',
        currentStatus: 'cancelled',
        nextStatus: 'pending'
      })
    ).toBe(false);

    expect(
      canTransitionFulfillmentState({
        mode: 'express',
        currentStatus: 'in_production',
        nextStatus: 'ready_to_ship'
      })
    ).toBe(true);
  });
});
