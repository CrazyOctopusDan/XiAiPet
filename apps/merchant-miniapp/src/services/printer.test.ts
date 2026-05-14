import { describe, expect, it, vi } from 'vitest';

import {
  connectReceiptPrinter,
  disconnectReceiptPrinter,
  getReceiptPrinterSettingsViewModel,
  getStoredReceiptPrinterConnection,
  printReceiptPrinterSelfTest,
  writeReceiptPrinterChunks
} from './printer';

function createWxClient() {
  const storage = new Map<string, unknown>();
  const writes: Uint8Array[] = [];

  return {
    storage,
    writes,
    openBluetoothAdapter: vi.fn(({ success }) => success({})),
    createBLEConnection: vi.fn(({ success }) => success({})),
    closeBLEConnection: vi.fn(({ success }) => success({})),
    getBLEDeviceServices: vi.fn(({ success }) =>
      success({
        services: [
          {
            uuid: 'service-readonly'
          },
          {
            uuid: 'service-printer'
          }
        ]
      })
    ),
    getBLEDeviceCharacteristics: vi.fn(({ serviceId, success }) =>
      success({
        characteristics:
          serviceId === 'service-printer'
            ? [
                {
                  uuid: 'char-write',
                  properties: {
                    write: true
                  }
                }
              ]
            : [
                {
                  uuid: 'char-read',
                  properties: {}
                }
              ]
      })
    ),
    writeBLECharacteristicValue: vi.fn(({ value, success }) => {
      writes.push(new Uint8Array(value));
      success({});
    }),
    setStorageSync: vi.fn((key, value) => storage.set(key, value)),
    getStorageSync: vi.fn((key) => storage.get(key)),
    removeStorageSync: vi.fn((key) => storage.delete(key))
  };
}

describe('merchant printer service', () => {
  it('formats printer settings status and discovered device count for the page header', () => {
    expect(getReceiptPrinterSettingsViewModel('未绑定', [])).toEqual({
      statusLabel: '未绑定',
      statusTone: 'empty',
      deviceCountLabel: '暂无设备'
    });
    expect(
      getReceiptPrinterSettingsViewModel('厨房小票机', [
        {
          deviceId: 'printer-001',
          name: '厨房小票机'
        },
        {
          deviceId: 'printer-002',
          name: '前台小票机'
        }
      ])
    ).toEqual({
      statusLabel: '已绑定',
      statusTone: 'ready',
      deviceCountLabel: '2 台设备'
    });
  });

  it('connects to the first writable BLE characteristic and stores the binding locally', async () => {
    const wxClient = createWxClient();

    const connection = await connectReceiptPrinter(
      {
        deviceId: 'printer-001',
        name: '厨房小票机'
      },
      wxClient
    );

    expect(connection).toMatchObject({
      deviceId: 'printer-001',
      name: '厨房小票机',
      serviceId: 'service-printer',
      characteristicId: 'char-write'
    });
    expect(getStoredReceiptPrinterConnection(wxClient)).toMatchObject({
      deviceId: 'printer-001',
      serviceId: 'service-printer',
      characteristicId: 'char-write'
    });
  });

  it('writes receipt chunks to the connected printer in order', async () => {
    const wxClient = createWxClient();
    const connection = await connectReceiptPrinter(
      {
        deviceId: 'printer-001',
        name: '厨房小票机'
      },
      wxClient
    );

    await writeReceiptPrinterChunks(['QUJD', 'REVG'], connection, wxClient);

    expect(wxClient.writeBLECharacteristicValue).toHaveBeenCalledTimes(2);
    expect(wxClient.writes.map((item) => Array.from(item))).toEqual([
      [65, 66, 67],
      [68, 69, 70]
    ]);
  });

  it('clears the local binding when disconnecting', async () => {
    const wxClient = createWxClient();
    const connection = await connectReceiptPrinter(
      {
        deviceId: 'printer-001',
        name: '厨房小票机'
      },
      wxClient
    );

    await disconnectReceiptPrinter(connection, wxClient);

    expect(wxClient.closeBLEConnection).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 'printer-001' }));
    expect(getStoredReceiptPrinterConnection(wxClient)).toBeNull();
  });

  it('uses the same serial BLE writer for printer self test', async () => {
    const wxClient = createWxClient();
    const connection = await connectReceiptPrinter(
      {
        deviceId: 'printer-001',
        name: '厨房小票机'
      },
      wxClient
    );

    await printReceiptPrinterSelfTest(connection, wxClient);

    expect(wxClient.writeBLECharacteristicValue).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'printer-001',
        serviceId: 'service-printer',
        characteristicId: 'char-write',
        value: expect.any(ArrayBuffer)
      })
    );
  });
});
