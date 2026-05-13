import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderReceiptPrintJob } from '@xiaipet/shared';

import { MERCHANT_SESSION_STORAGE_KEY, type MerchantApiRequester } from './api-client';
import { printOrderReceipt } from './order-receipt-print';

const JOB: OrderReceiptPrintJob = {
  printJobId: 'order-001-receipt-v1-1',
  orderId: 'order-001',
  receiptTemplateVersion: 'receipt-v1',
  previewLines: ['XiAiPet', 'order-001'],
  chunksBase64: ['QUJD'],
  nextPrintCount: 1,
  isReprint: false
};

function createRequest() {
  return vi.fn((path: string) => {
    if (path.endsWith('/receipt-print/prepare')) {
      return Promise.resolve({
        ok: true,
        job: JOB
      });
    }

    return Promise.resolve({
      ok: true
    });
  });
}

describe('merchant order receipt print service', () => {
  beforeEach(() => {
    vi.stubGlobal('wx', {
      getStorageSync: vi.fn((key: string) =>
        key === MERCHANT_SESSION_STORAGE_KEY
          ? {
              token: 'merchant-token',
              expiresAt: '2099-01-01T00:00:00.000Z',
              account: {
                id: 'acct-admin',
                username: 'admin',
                role: 'admin',
                mustChangePassword: false
              }
            }
          : undefined
      )
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prepares a job, writes chunks, and records a successful print audit', async () => {
    const request = createRequest();
    const writeChunks = vi.fn().mockResolvedValue(undefined);

    await printOrderReceipt(
      {
        orderId: 'order-001'
      },
      {
        request: request as unknown as MerchantApiRequester,
        getConnection: () => ({
          deviceId: 'printer-001',
          name: '厨房小票机',
          serviceId: 'service-printer',
          characteristicId: 'char-write',
          connectedAt: '2026-04-18T10:00:00.000Z'
        }),
        writeChunks,
        now: () => '2026-04-18T11:00:00.000Z'
      }
    );

    expect(writeChunks).toHaveBeenCalledWith(
      ['QUJD'],
      expect.objectContaining({
        deviceId: 'printer-001'
      })
    );
    expect(request).toHaveBeenLastCalledWith(
      '/api/v1/merchant/orders/order-001/receipt-print/result',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          orderId: 'order-001',
          printerDeviceId: 'printer-001',
          printerDeviceLabel: '厨房小票机',
          result: 'success'
        }),
        auth: 'merchant'
      })
    );
  });

  it('accepts the backend print response shape during the route migration', async () => {
    const request = vi.fn((path: string) => {
      if (path.endsWith('/receipt-print/prepare')) {
        return Promise.resolve({
          ok: true,
          print: JOB
        });
      }

      return Promise.resolve({ ok: true });
    });
    const writeChunks = vi.fn().mockResolvedValue(undefined);

    await expect(
      printOrderReceipt(
        {
          orderId: 'order-001'
        },
        {
          request: request as unknown as MerchantApiRequester,
          getConnection: () => ({
            deviceId: 'printer-001',
            name: '厨房小票机',
            serviceId: 'service-printer',
            characteristicId: 'char-write',
            connectedAt: '2026-04-18T10:00:00.000Z'
          }),
          writeChunks,
          now: () => '2026-04-18T11:00:00.000Z'
        }
      )
    ).resolves.toEqual(JOB);

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/orders/order-001/receipt-print/prepare', {
      method: 'POST',
      body: {},
      auth: 'merchant'
    });
  });

  it('records a failed audit when no printer is configured', async () => {
    const request = createRequest();

    await expect(
      printOrderReceipt(
        {
          orderId: 'order-001'
        },
        {
          request: request as unknown as MerchantApiRequester,
          getConnection: () => null,
          now: () => '2026-04-18T11:00:00.000Z'
        }
      )
    ).rejects.toThrow('NO_PRINTER_CONNECTED');

    expect(request).toHaveBeenLastCalledWith(
      '/api/v1/merchant/orders/order-001/receipt-print/result',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          printerDeviceId: 'unconfigured',
          result: 'failed',
          failureReason: 'NO_PRINTER_CONNECTED'
        }),
        auth: 'merchant'
      })
    );
  });

  it('records a failed audit when BLE writing fails', async () => {
    const request = createRequest();

    await expect(
      printOrderReceipt(
        {
          orderId: 'order-001'
        },
        {
          request: request as unknown as MerchantApiRequester,
          getConnection: () => ({
            deviceId: 'printer-001',
            name: '厨房小票机',
            serviceId: 'service-printer',
            characteristicId: 'char-write',
            connectedAt: '2026-04-18T10:00:00.000Z'
          }),
          writeChunks: vi.fn().mockRejectedValue(new Error('BLE_WRITE_FAILED')),
          now: () => '2026-04-18T11:00:00.000Z'
        }
      )
    ).rejects.toThrow('BLE_WRITE_FAILED');

    expect(request).toHaveBeenLastCalledWith(
      '/api/v1/merchant/orders/order-001/receipt-print/result',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          printerDeviceId: 'printer-001',
          result: 'failed',
          failureReason: 'BLE_WRITE_FAILED'
        }),
        auth: 'merchant'
      })
    );
  });
});
