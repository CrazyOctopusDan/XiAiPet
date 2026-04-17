import { describe, expect, it } from 'vitest';

import type { MerchantManagedOrderRecord } from '../shared/order-store';
import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

function createOrder(overrides: Partial<MerchantManagedOrderRecord> = {}): MerchantManagedOrderRecord {
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
      status: 'pending',
      updatedAt: '2026-04-17T10:00:00.000Z'
    },
    merchantOverride: {
      manualSettlement: {
        method: 'offline_collection',
        reasonNote: '门店现场已收款，人工补录。',
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
        settledAt: '2026-04-17T09:30:00.000Z'
      }
    },
    pricing: {
      itemsSubtotal: 98,
      deliveryFee: 10,
      payableTotal: 108
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
    createdAt: '2026-04-17T09:00:00.000Z',
    updatedAt: '2026-04-17T10:00:00.000Z',
    paidAt: '2026-04-17T09:30:00.000Z',
    idempotencyKey: 'checkout-merchant-001',
    ...overrides
  };
}

describe('getMerchantOrderDetail cloud function', () => {
  it('returns a merchant-safe detail payload and exposes manual settlement audit in the timeline', async () => {
    const result = await main(
      {
        orderId: 'order-merchant-001',
        merchantUser: {
          openid: 'merchant-openid',
          merchantId: 'merchant-001',
          storeName: '虾衣宠物烘焙工作室',
          enabled: true,
          grantedAt: '2026-04-01T00:00:00.000Z'
        }
      },
      { OPENID: 'merchant-openid' },
      {
        getById: async () => createOrder()
      }
    );

    expect(result.order).toMatchObject({
      id: 'order-merchant-001',
      merchantOverride: {
        manualSettlement: {
          method: 'offline_collection'
        }
      }
    });
    expect(result.order).not.toHaveProperty('openid');
    expect(result.order).not.toHaveProperty('idempotencyKey');
    expect(result.timeline[0]).toMatchObject({
      type: 'fulfillment',
      label: '待处理'
    });
    expect(result.timeline.find((entry) => entry.type === 'manual_settlement')).toMatchObject({
      detail: '门店现场已收款，人工补录。',
      operator: {
        name: '店主小虾'
      }
    });
  });
});
