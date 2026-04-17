import { describe, expect, it } from 'vitest';

import type { MerchantManagedOrderRecord } from '../shared/order-store';
import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

function createMerchantOrder(overrides: Partial<MerchantManagedOrderRecord> = {}): MerchantManagedOrderRecord {
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

describe('queryMerchantOrders cloud function', () => {
  it('requires merchant auth and groups paid orders by fulfillment progress instead of payment result', async () => {
    const result = await main(
      {
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
        listMerchantOrders: async () => [
          createMerchantOrder({
            id: 'order-unpaid',
            status: 'pending_payment',
            payment: {
              method: 'wechat',
              status: 'pending'
            },
            fulfillmentState: undefined,
            updatedAt: '2026-04-17T11:00:00.000Z'
          }),
          createMerchantOrder({
            id: 'order-delivery',
            fulfillmentState: {
              mode: 'delivery',
              status: 'pending',
              updatedAt: '2026-04-17T10:00:00.000Z'
            },
            updatedAt: '2026-04-17T10:00:00.000Z'
          }),
          createMerchantOrder({
            id: 'order-pickup',
            snapshot: {
              fulfillment: {
                mode: 'pickup',
                store: {
                  name: '虾衣宠物烘焙工作室',
                  address: '上海市静安区南京西路 1266 号 8 楼'
                }
              },
              items: [],
              pets: [],
              remark: ''
            },
            fulfillmentState: {
              mode: 'pickup',
              status: 'completed',
              updatedAt: '2026-04-17T08:00:00.000Z'
            },
            updatedAt: '2026-04-17T08:00:00.000Z'
          })
        ]
      }
    );

    expect(result.groups).toHaveLength(3);
    expect(result.groups.map((group) => group.groupLabel)).toEqual(['待付款', '待处理', '已完成']);
    expect(result.groups[1].orders[0]).toMatchObject({
      id: 'order-delivery',
      statusLabel: '待处理'
    });
  });

  it('rejects non-merchant access', async () => {
    await expect(main({}, { OPENID: 'merchant-openid' }, { listMerchantOrders: async () => [] })).rejects.toThrow(
      'MERCHANT_FORBIDDEN'
    );
  });
});
