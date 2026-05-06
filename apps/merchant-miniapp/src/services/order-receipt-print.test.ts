import { describe, expect, it, vi } from 'vitest';

import type { OrderReceiptPrintJob } from '@xiaipet/shared';

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

function createVerifyAccess() {
  return vi.fn().mockResolvedValue({
    result: {
      allowed: true,
      merchant: {
        merchantId: 'merchant-001',
        storeName: '虾衣宠物烘焙工作室'
      }
    }
  });
}

function createCallFunction() {
  return vi.fn((payload: Record<string, unknown>) => {
    if (payload.name === 'prepareOrderReceiptPrint') {
      return Promise.resolve({
        result: {
          ok: true,
          job: JOB
        }
      });
    }

    return Promise.resolve({
      result: {
        ok: true
      }
    });
  });
}

describe('merchant order receipt print service', () => {
  it('prepares a job, writes chunks, and records a successful print audit', async () => {
    const callFunction = createCallFunction();
    const writeChunks = vi.fn().mockResolvedValue(undefined);

    await printOrderReceipt(
      {
        orderId: 'order-001'
      },
      {
        callFunction,
        accessVerifier: createVerifyAccess(),
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
    expect(callFunction).toHaveBeenLastCalledWith({
      name: 'recordOrderReceiptPrintResult',
      data: expect.objectContaining({
        orderId: 'order-001',
        printerDeviceId: 'printer-001',
        printerDeviceLabel: '厨房小票机',
        result: 'success'
      })
    });
  });

  it('records a failed audit when no printer is configured', async () => {
    const callFunction = createCallFunction();

    await expect(
      printOrderReceipt(
        {
          orderId: 'order-001'
        },
        {
          callFunction,
          accessVerifier: createVerifyAccess(),
          getConnection: () => null,
          now: () => '2026-04-18T11:00:00.000Z'
        }
      )
    ).rejects.toThrow('NO_PRINTER_CONNECTED');

    expect(callFunction).toHaveBeenLastCalledWith({
      name: 'recordOrderReceiptPrintResult',
      data: expect.objectContaining({
        printerDeviceId: 'unconfigured',
        result: 'failed',
        failureReason: 'NO_PRINTER_CONNECTED'
      })
    });
  });

  it('records a failed audit when BLE writing fails', async () => {
    const callFunction = createCallFunction();

    await expect(
      printOrderReceipt(
        {
          orderId: 'order-001'
        },
        {
          callFunction,
          accessVerifier: createVerifyAccess(),
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

    expect(callFunction).toHaveBeenLastCalledWith({
      name: 'recordOrderReceiptPrintResult',
      data: expect.objectContaining({
        printerDeviceId: 'printer-001',
        result: 'failed',
        failureReason: 'BLE_WRITE_FAILED'
      })
    });
  });
});
