import { describe, expect, it } from 'vitest';

import type { MerchantManagedOrderRecord } from './order-store';
import { applyReceiptPrintAudit, createReceiptPrintJob } from './order-receipt-print';

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
      updatedAt: '2026-05-05T01:00:00.000Z'
    },
    pricing: {
      itemsSubtotal: 98,
      deliveryFee: 15,
      payableTotal: 113
    },
    snapshot: {
      fulfillment: {
        mode: 'delivery',
        address: {
          recipientName: '张三',
          phoneNumber: '13800000000',
          regionLabel: '上海市静安区',
          detailAddress: '南京西路 1266 号',
          tag: '家'
        },
        reservation: {
          dateValue: '2026-05-06',
          dateLabel: '明天',
          timeValue: '10:00',
          timeLabel: '10:00-10:30'
        },
        store: {
          name: '虾衣宠物烘焙',
          address: '上海市静安区门店'
        }
      },
      items: [
        {
          productId: 'cake-001',
          name: '生日蛋糕',
          quantity: 1,
          unitPrice: 98,
          specId: 'small',
          specLabel: '4寸',
          lineTotal: 98
        }
      ],
      pets: [{ id: 'pet-001', name: '糯米' }],
      remark: '少糖'
    },
    createdAt: '2026-05-05T01:00:00.000Z',
    updatedAt: '2026-05-05T01:00:00.000Z',
    paidAt: '2026-05-05T01:01:00.000Z',
    ...overrides
  };
}

describe('order receipt printing helpers', () => {
  it('generates receipt jobs from persisted order snapshots only', () => {
    const job = createReceiptPrintJob(createOrder(), '2026-05-05T02:00:00.000Z');

    expect(job.orderId).toBe('order-print-001');
    expect(job.isReprint).toBe(false);
    expect(job.nextPrintCount).toBe(1);
    expect(job.chunksBase64.length).toBeGreaterThan(1);
    expect(job.previewLines).toContain('订单号：order-print-001');
    expect(job.previewLines.join('\n')).toContain('生日蛋糕');
    expect(job.previewLines.join('\n')).toContain('南京西路 1266 号');
  });

  it('marks follow-up jobs as reprints from existing print metadata', () => {
    const job = createReceiptPrintJob(
      createOrder({
        receiptPrint: {
          printCount: 1,
          receiptTemplateVersion: 'receipt-v1'
        }
      }),
      '2026-05-05T02:00:00.000Z'
    );

    expect(job.isReprint).toBe(true);
    expect(job.nextPrintCount).toBe(2);
    expect(job.previewLines).toContain('*** 补打小票 ***');
  });

  it('persists print audit and increments count only on successful prints', () => {
    const order = createOrder();
    const printed = applyReceiptPrintAudit(order, {
      orderId: order.id,
      operator: {
        id: 'merchant-openid',
        name: '店主'
      },
      printedAt: '2026-05-05T02:00:00.000Z',
      printerDeviceId: 'device-001',
      printerDeviceLabel: '厨房小票机',
      receiptTemplateVersion: 'receipt-v1',
      result: 'success',
      isReprint: false
    });

    expect(printed.receiptPrint?.printCount).toBe(1);
    expect(printed.merchantTimeline?.[0]).toMatchObject({
      type: 'print',
      label: '打印小票',
      toStatus: 'success'
    });

    const failed = applyReceiptPrintAudit(printed, {
      orderId: order.id,
      operator: {
        id: 'merchant-openid',
        name: '店主'
      },
      printedAt: '2026-05-05T02:10:00.000Z',
      printerDeviceId: 'device-001',
      printerDeviceLabel: '厨房小票机',
      receiptTemplateVersion: 'receipt-v1',
      result: 'failed',
      failureReason: '蓝牙断开',
      isReprint: true
    });

    expect(failed.receiptPrint?.printCount).toBe(1);
    expect(failed.receiptPrint?.lastPrintResult).toBe('failed');
  });
});
