"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const order_receipt_print_1 = require("./order-receipt-print");
(0, vitest_1.describe)('order receipt print contracts', () => {
    (0, vitest_1.it)('accepts auditable print metadata without changing fulfillment state', () => {
        (0, vitest_1.expect)((0, order_receipt_print_1.isOrderReceiptPrintMetadata)({
            printCount: 2,
            lastPrintedAt: '2026-05-05T02:00:00.000Z',
            lastPrintResult: 'success',
            lastPrinterDeviceLabel: '厨房小票机',
            receiptTemplateVersion: 'receipt-v1'
        })).toBe(true);
        (0, vitest_1.expect)((0, order_receipt_print_1.isOrderReceiptPrintMetadata)({
            printCount: -1,
            receiptTemplateVersion: 'receipt-v1'
        })).toBe(false);
    });
    (0, vitest_1.it)('requires success and failure print attempts to preserve operator and device audit data', () => {
        (0, vitest_1.expect)((0, order_receipt_print_1.isOrderReceiptPrintAuditPayload)({
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
        })).toBe(true);
        (0, vitest_1.expect)((0, order_receipt_print_1.isOrderReceiptPrintAuditPayload)({
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
        })).toBe(true);
        (0, vitest_1.expect)((0, order_receipt_print_1.isOrderReceiptPrintAuditPayload)({
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
        })).toBe(false);
        (0, vitest_1.expect)((0, order_receipt_print_1.isOrderReceiptPrintAuditPayload)({
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
        })).toBe(false);
    });
    (0, vitest_1.it)('accepts backend-generated receipt jobs with chunked transport data', () => {
        (0, vitest_1.expect)((0, order_receipt_print_1.isOrderReceiptPrintJob)({
            orderId: 'order-001',
            printJobId: 'print-order-001-1',
            receiptTemplateVersion: 'receipt-v1',
            isReprint: false,
            nextPrintCount: 1,
            chunksBase64: ['G0A=', '5bCP56Wo'],
            previewLines: ['虾衣宠', '订单 order-001']
        })).toBe(true);
    });
});
