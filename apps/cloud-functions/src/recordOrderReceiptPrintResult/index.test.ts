import { describe, expect, it, vi } from 'vitest';

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
    pricing: {
      itemsSubtotal: 98,
      deliveryFee: 10,
      payableTotal: 108
    },
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
    createdAt: '2026-05-05T01:00:00.000Z',
    updatedAt: '2026-05-05T02:00:00.000Z',
    ...overrides
  };
}

describe('recordOrderReceiptPrintResult cloud function', () => {
  it('sanitizes auth event fields and persists successful print audit metadata', async () => {
    const save = vi.fn(async (order: MerchantManagedOrderRecord) => order);

    const result = await main(
      {
        orderId: 'order-print-001',
        operator: {
          id: 'merchant-001',
          name: '店主小虾'
        },
        printedAt: '2026-05-05T02:30:00.000Z',
        printerDeviceId: 'ble-device-id',
        printerDeviceLabel: '厨房小票机',
        receiptTemplateVersion: 'receipt-v1',
        result: 'success',
        isReprint: false,
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
        getById: async () => createOrder(),
        save
      }
    );

    expect(result.order.receiptPrint).toMatchObject({
      printCount: 1,
      lastPrintResult: 'success',
      lastPrinterDeviceLabel: '厨房小票机'
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantTimeline: [
          expect.objectContaining({
            type: 'print',
            label: '打印小票'
          })
        ]
      })
    );
  });
});
