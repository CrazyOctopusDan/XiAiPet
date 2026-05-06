declare const wx: any;

export interface ReceiptPrinterCandidate {
  deviceId: string;
  name: string;
  localName?: string;
}

export interface ReceiptPrinterConnection {
  deviceId: string;
  name: string;
  serviceId: string;
  characteristicId: string;
  connectedAt: string;
}

interface BluetoothService {
  uuid: string;
  isPrimary?: boolean;
}

interface BluetoothCharacteristic {
  uuid: string;
  properties?: {
    write?: boolean;
    writeNoResponse?: boolean;
  };
}

const RECEIPT_PRINTER_STORAGE_KEY = 'xiaipet.receiptPrinter.v1';
const DISCOVERY_TIMEOUT_MS = 6000;
const SELF_TEST_CHUNKS_BASE64 = ['WGlBaVBldCBwcmludGVyIHRlc3QKQmluZGluZyBPSwoKCg=='];

let writeQueue: Promise<void> = Promise.resolve();

function getWxClient(client?: any) {
  return client ?? wx;
}

function callWx<T = any>(client: any, methodName: string, data: Record<string, unknown> = {}) {
  return new Promise<T>((resolve, reject) => {
    const method = client?.[methodName];

    if (typeof method !== 'function') {
      reject(new Error(`WX_METHOD_UNAVAILABLE:${methodName}`));
      return;
    }

    method.call(client, {
      ...data,
      success: resolve,
      fail: reject
    });
  });
}

function normalizeDeviceName(device: { name?: string; localName?: string }) {
  return (device.name || device.localName || '未命名打印机').trim();
}

function toCandidate(device: { deviceId?: string; name?: string; localName?: string }): ReceiptPrinterCandidate | null {
  if (!device.deviceId) {
    return null;
  }

  return {
    deviceId: device.deviceId,
    name: normalizeDeviceName(device),
    localName: device.localName
  };
}

function isWritableCharacteristic(characteristic: BluetoothCharacteristic) {
  return Boolean(characteristic.properties?.write || characteristic.properties?.writeNoResponse);
}

function readStorage(client: any): ReceiptPrinterConnection | null {
  const value = client.getStorageSync?.(RECEIPT_PRINTER_STORAGE_KEY);

  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<ReceiptPrinterConnection>;

  if (!candidate.deviceId || !candidate.serviceId || !candidate.characteristicId) {
    return null;
  }

  return {
    deviceId: candidate.deviceId,
    name: candidate.name || '已绑定打印机',
    serviceId: candidate.serviceId,
    characteristicId: candidate.characteristicId,
    connectedAt: candidate.connectedAt || new Date(0).toISOString()
  };
}

function base64ToArrayBuffer(client: any, base64: string) {
  if (typeof client.base64ToArrayBuffer === 'function') {
    return client.base64ToArrayBuffer(base64) as ArrayBuffer;
  }

  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export function getStoredReceiptPrinterConnection(client = getWxClient()) {
  return readStorage(client);
}

export function clearStoredReceiptPrinterConnection(client = getWxClient()) {
  client.removeStorageSync?.(RECEIPT_PRINTER_STORAGE_KEY);
}

export async function discoverReceiptPrinterDevices(options: { timeoutMs?: number } = {}, client = getWxClient()) {
  const devices = new Map<string, ReceiptPrinterCandidate>();

  await callWx(client, 'openBluetoothAdapter');

  client.onBluetoothDeviceFound?.((event: { devices?: Array<{ deviceId?: string; name?: string; localName?: string }> }) => {
    for (const device of event.devices ?? []) {
      const candidate = toCandidate(device);

      if (candidate) {
        devices.set(candidate.deviceId, candidate);
      }
    }
  });

  await callWx(client, 'startBluetoothDevicesDiscovery', {
    allowDuplicatesKey: false
  });

  await new Promise((resolve) => setTimeout(resolve, options.timeoutMs ?? DISCOVERY_TIMEOUT_MS));

  try {
    await callWx(client, 'stopBluetoothDevicesDiscovery');
  } catch {
    // Discovery may already be stopped by the system; the collected devices are still useful.
  }

  return Array.from(devices.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export async function connectReceiptPrinter(candidate: ReceiptPrinterCandidate, client = getWxClient()) {
  await callWx(client, 'openBluetoothAdapter');
  await callWx(client, 'createBLEConnection', {
    deviceId: candidate.deviceId
  });

  const servicesResponse = await callWx<{ services?: BluetoothService[] }>(client, 'getBLEDeviceServices', {
    deviceId: candidate.deviceId
  });

  for (const service of servicesResponse.services ?? []) {
    const characteristicsResponse = await callWx<{ characteristics?: BluetoothCharacteristic[] }>(
      client,
      'getBLEDeviceCharacteristics',
      {
        deviceId: candidate.deviceId,
        serviceId: service.uuid
      }
    );
    const writable = characteristicsResponse.characteristics?.find(isWritableCharacteristic);

    if (writable) {
      const connection: ReceiptPrinterConnection = {
        deviceId: candidate.deviceId,
        name: candidate.name,
        serviceId: service.uuid,
        characteristicId: writable.uuid,
        connectedAt: new Date().toISOString()
      };

      client.setStorageSync?.(RECEIPT_PRINTER_STORAGE_KEY, connection);
      return connection;
    }
  }

  throw new Error('NO_WRITABLE_PRINTER_CHARACTERISTIC');
}

export async function disconnectReceiptPrinter(connection = getStoredReceiptPrinterConnection(), client = getWxClient()) {
  if (connection) {
    try {
      await callWx(client, 'closeBLEConnection', {
        deviceId: connection.deviceId
      });
    } catch {
      // Local binding is cleared even if the connection was already closed.
    }
  }

  clearStoredReceiptPrinterConnection(client);
}

export async function writeReceiptPrinterChunks(
  chunksBase64: string[],
  connection = getStoredReceiptPrinterConnection(),
  client = getWxClient()
) {
  const run = async () => {
    if (!connection) {
      throw new Error('NO_PRINTER_CONNECTED');
    }

    for (const chunk of chunksBase64) {
      await callWx(client, 'writeBLECharacteristicValue', {
        deviceId: connection.deviceId,
        serviceId: connection.serviceId,
        characteristicId: connection.characteristicId,
        value: base64ToArrayBuffer(client, chunk)
      });
    }
  };

  const current = writeQueue.catch(() => undefined).then(run);
  writeQueue = current.catch(() => undefined);
  return current;
}

export async function printReceiptPrinterSelfTest(connection = getStoredReceiptPrinterConnection(), client = getWxClient()) {
  await writeReceiptPrinterChunks(SELF_TEST_CHUNKS_BASE64, connection, client);
}
