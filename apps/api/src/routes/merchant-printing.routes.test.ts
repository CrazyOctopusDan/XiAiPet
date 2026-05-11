import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { authHeader, testConfig } from './test-helpers';

describe('merchant printing routes', () => {
  it('routes prepare and result calls for allowed merchants', async () => {
    const printingService = {
      prepareOrderReceiptPrint: vi.fn(async () => ({ ok: true, print: { orderId: 'order-1' } })),
      recordOrderReceiptPrintResult: vi.fn(async () => ({ ok: true, audit: { id: 'audit-1' } }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({ ok: true, status: 'allowed', allowed: true, merchant: { merchantId: 'm1', storeName: 'store' } })
        },
        printingService
      }
    });

    const headers = authHeader('merchant');
    expect((await app.inject({ method: 'POST', url: '/api/v1/merchant/orders/order-1/receipt-print/prepare', headers, payload: {} })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/v1/merchant/orders/order-1/receipt-print/result', headers, payload: { result: 'success' } })).statusCode).toBe(200);
    expect(printingService.prepareOrderReceiptPrint).toHaveBeenCalled();
    expect(printingService.recordOrderReceiptPrintResult).toHaveBeenCalled();
  });

  it('rejects denied merchants before printing service call', async () => {
    const prepareOrderReceiptPrint = vi.fn(async () => ({ ok: true }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({ ok: true, status: 'denied', allowed: false })
        },
        printingService: {
          prepareOrderReceiptPrint,
          recordOrderReceiptPrintResult: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({ method: 'POST', url: '/api/v1/merchant/orders/order-1/receipt-print/prepare', headers: authHeader('denied'), payload: {} });
    expect(response.statusCode).toBe(403);
    expect(prepareOrderReceiptPrint).not.toHaveBeenCalled();
  });
});
