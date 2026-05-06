import { describe, expect, it } from 'vitest';

import {
  isOrderReceiptPrintAuditPayload,
  isOrderReceiptPrintJob,
  isOrderReceiptPrintMetadata
} from './order-receipt-print';

describe('order receipt print contracts', () => {
  it('accepts auditable print metadata without changing fulfillment state', () => {
    expect(
      isOrderReceiptPrintMetadata({
        printCount: 2,
        lastPrintedAt: '2026-05-05T02:00:00.000Z',
        lastPrintResult: 'success',
        lastPrinterDeviceLabel: '厨房小票机',
        receiptTemplateVersion: 'receipt-v1'
      })
    ).toBe(true);

    expect(
      isOrderReceiptPrintMetadata({
        printCount: -1,
        receiptTemplateVersion: 'receipt-v1'
      })
    ).toBe(false);
  });

  it('requires success and failure print attempts to preserve operator and device audit data', () => {
    expect(
      isOrderReceiptPrintAuditPayload({
        orderId: 'order-001',
        operator: {
          id: 'merchant-openid',
          name: '店主'
        },
        printedAt: '2026-05-05T02:00:00.000Z',
        printerDeviceId: 'ble-device-id',
        printerDeviceLabel: '厨房小票机',
        receiptTemplateVersion: 'receipt-v1',
        result: 'success',
        failureReason: undefined,
        isReprint: true
      })
    ).toBe(true);

    expect(
      isOrderReceiptPrintAuditPayload({
        orderId: 'order-001',
        operator: {
          id: 'merchant-openid',
          name: '店主'
        },
        printedAt: '2026-05-05T02:00:00.000Z',
        printerDeviceId: 'ble-device-id',
        printerDeviceLabel: '厨房小票机',
        receiptTemplateVersion: 'receipt-v1',
        result: 'success',
        isReprint: false
      })
    ).toBe(true);

    expect(
      isOrderReceiptPrintAuditPayload({
        orderId: 'order-001',
        operator: {
          id: 'merchant-openid',
          name: '店主'
        },
        printedAt: '2026-05-05T02:00:00.000Z',
        printerDeviceId: 'ble-device-id',
        printerDeviceLabel: '厨房小票机',
        receiptTemplateVersion: 'receipt-v1',
        result: 'failed',
        failureReason: '',
        isReprint: false
      })
    ).toBe(false);

    expect(
      isOrderReceiptPrintAuditPayload({
        orderId: 'order-001',
        operator: {
          id: 'merchant-openid',
          name: '店主'
        },
        printedAt: '2026-05-05T02:00:00.000Z',
        printerDeviceId: 'ble-device-id',
        printerDeviceLabel: '厨房小票机',
        receiptTemplateVersion: 'receipt-v1',
        result: 'success',
        isReprint: false,
        openid: 'merchant-openid'
      })
    ).toBe(false);
  });

  it('accepts backend-generated receipt jobs with chunked transport data', () => {
    expect(
      isOrderReceiptPrintJob({
        orderId: 'order-001',
        printJobId: 'print-order-001-1',
        receiptTemplateVersion: 'receipt-v1',
        isReprint: false,
        nextPrintCount: 1,
        chunksBase64: ['G0A=', '5bCP56Wo'],
        previewLines: ['虾衣宠', '订单 order-001']
      })
    ).toBe(true);
  });
});
