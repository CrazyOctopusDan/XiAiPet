import { describe, expect, it, vi } from 'vitest';

import type { MerchantManagedOrderRecord } from '../shared/order-store';
import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

function createPaidOrder(overrides: Partial<MerchantManagedOrderRecord> = {}): MerchantManagedOrderRecord {
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
    ...overrides
  };
}

describe('updateMerchantOrderStatus cloud function', () => {
  it('accepts valid next-state changes and appends a fulfillment audit timeline entry', async () => {
    const save = vi.fn(async (order: MerchantManagedOrderRecord) => order);
    const result = await main(
      {
        orderId: 'order-merchant-001',
        nextFulfillmentStatus: 'in_production',
        operator: {
          id: 'merchant-001',
          name: '店主小虾'
        },
        merchantUser: {
          openid: 'merchant-openid',
          merchantId: 'merchant-001',
          storeName: '虾衣宠物烘焙工作室',
          enabled: true,
          grantedAt: '2026-04-01T00:00:00.000Z'
        },
        now: '2026-04-17T10:30:00.000Z'
      },
      { OPENID: 'merchant-openid' },
      {
        getById: async () => createPaidOrder(),
        save
      }
    );

    expect(result.order.fulfillmentState).toMatchObject({
      status: 'in_production'
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantTimeline: [
          expect.objectContaining({
            type: 'fulfillment',
            toStatus: 'in_production'
          })
        ]
      })
    );
  });

  it('requires manual settlement details when forcing an unpaid order into paid state', async () => {
    const save = vi.fn(async (order: MerchantManagedOrderRecord) => order);
    const result = await main(
      {
        orderId: 'order-merchant-002',
        nextOrderStatus: 'paid',
        adjustmentMethod: 'offline_collection',
        reasonNote: '门店现场已收款，补录支付。',
        operator: {
          id: 'merchant-001',
          name: '店主小虾'
        },
        merchantUser: {
          openid: 'merchant-openid',
          merchantId: 'merchant-001',
          storeName: '虾衣宠物烘焙工作室',
          enabled: true,
          grantedAt: '2026-04-01T00:00:00.000Z'
        },
        now: '2026-04-17T10:30:00.000Z'
      },
      { OPENID: 'merchant-openid' },
      {
        getById: async () =>
          createPaidOrder({
            status: 'pending_payment',
            payment: {
              method: 'wechat',
              status: 'pending'
            }
          }),
        save
      }
    );

    expect(result.order.merchantOverride?.manualSettlement).toMatchObject({
      method: 'offline_collection',
      reasonNote: '门店现场已收款，补录支付。'
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantTimeline: [
          expect.objectContaining({
            type: 'manual_settlement',
            toStatus: 'paid'
          })
        ]
      })
    );
  });

  it('rejects further mutations once an order reaches a terminal state', async () => {
    await expect(
      main(
        {
          orderId: 'order-merchant-003',
          nextFulfillmentStatus: 'in_production',
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
          getById: async () =>
            createPaidOrder({
              fulfillmentState: {
                mode: 'delivery',
                status: 'completed',
                updatedAt: '2026-04-17T11:00:00.000Z'
              }
            }),
          save: async (order: MerchantManagedOrderRecord) => order
        }
      )
    ).rejects.toThrow('ORDER_TERMINAL_LOCKED');
  });
});
