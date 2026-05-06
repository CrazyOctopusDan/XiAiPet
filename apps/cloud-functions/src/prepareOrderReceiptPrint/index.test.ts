import { describe, expect, it } from 'vitest';

import type { MerchantManagedOrderRecord } from '../shared/order-store';
import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

function createOrder(overrides: Partial<MerchantManagedOrderRecord> = {}): MerchantManagedOrderRecord {
  return {
    id: 'order-print-001',
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
      updatedAt: '2026-05-05T02:00:00.000Z'
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
          id: 'address-001',
          recipientName: '虾衣妈妈',
          phoneNumber: '13800001234',
          regionLabel: '上海市 静安区',
          detailAddress: '南京西路 1266 号 8 楼',
          tag: '家'
        },
        store: {
          name: '虾衣宠物烘焙工作室',
          address: '上海市静安区南京西路 1266 号 8 楼'
        }
      },
      items: [
        {
          productId: 'cake-001',
          name: '海洋派对蛋糕',
          quantity: 2,
          unitPrice: 49,
          specId: 'spec-4inch',
          specLabel: '4 寸',
          lineTotal: 98
        }
      ],
      pets: [],
      remark: ''
    },
    createdAt: '2026-05-05T01:00:00.000Z',
    updatedAt: '2026-05-05T02:00:00.000Z',
    ...overrides
  };
}

describe('prepareOrderReceiptPrint cloud function', () => {
  it('returns a merchant-only backend-generated receipt print job', async () => {
    const result = await main(
      {
        orderId: 'order-print-001',
        now: '2026-05-05T02:30:00.000Z',
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

    expect(result.job).toMatchObject({
      orderId: 'order-print-001',
      receiptTemplateVersion: 'receipt-v1',
      isReprint: false,
      nextPrintCount: 1
    });
    expect(result.job.previewLines).toContain('海洋派对蛋糕 4 寸');
    expect(result.job.chunksBase64.length).toBeGreaterThan(0);
  });
});
