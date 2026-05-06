"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredReceiptPrinterConnection = getStoredReceiptPrinterConnection;
exports.clearStoredReceiptPrinterConnection = clearStoredReceiptPrinterConnection;
exports.discoverReceiptPrinterDevices = discoverReceiptPrinterDevices;
exports.connectReceiptPrinter = connectReceiptPrinter;
exports.disconnectReceiptPrinter = disconnectReceiptPrinter;
exports.writeReceiptPrinterChunks = writeReceiptPrinterChunks;
exports.printReceiptPrinterSelfTest = printReceiptPrinterSelfTest;
const RECEIPT_PRINTER_STORAGE_KEY = 'xiaipet.receiptPrinter.v1';
const DISCOVERY_TIMEOUT_MS = 6000;
const SELF_TEST_CHUNKS_BASE64 = ['WGlBaVBldCBwcmludGVyIHRlc3QKQmluZGluZyBPSwoKCg=='];
let writeQueue = Promise.resolve();
function getWxClient(client) {
    return client !== null && client !== void 0 ? client : wx;
}
function callWx(client, methodName, data = {}) {
    return new Promise((resolve, reject) => {
        const method = client === null || client === void 0 ? void 0 : client[methodName];
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
function normalizeDeviceName(device) {
    return (device.name || device.localName || '未命名打印机').trim();
}
function toCandidate(device) {
    if (!device.deviceId) {
        return null;
    }
    return {
        deviceId: device.deviceId,
        name: normalizeDeviceName(device),
        localName: device.localName
    };
}
function isWritableCharacteristic(characteristic) {
    var _a, _b;
    return Boolean(((_a = characteristic.properties) === null || _a === void 0 ? void 0 : _a.write) || ((_b = characteristic.properties) === null || _b === void 0 ? void 0 : _b.writeNoResponse));
}
function readStorage(client) {
    var _a;
    const value = (_a = client.getStorageSync) === null || _a === void 0 ? void 0 : _a.call(client, RECEIPT_PRINTER_STORAGE_KEY);
    if (!value || typeof value !== 'object') {
        return null;
    }
    const candidate = value;
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
function base64ToArrayBuffer(client, base64) {
    if (typeof client.base64ToArrayBuffer === 'function') {
        return client.base64ToArrayBuffer(base64);
    }
    const buffer = Buffer.from(base64, 'base64');
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
function getStoredReceiptPrinterConnection(client = getWxClient()) {
    return readStorage(client);
}
function clearStoredReceiptPrinterConnection(client = getWxClient()) {
    var _a;
    (_a = client.removeStorageSync) === null || _a === void 0 ? void 0 : _a.call(client, RECEIPT_PRINTER_STORAGE_KEY);
}
async function discoverReceiptPrinterDevices(options = {}, client = getWxClient()) {
    var _a;
    const devices = new Map();
    await callWx(client, 'openBluetoothAdapter');
    (_a = client.onBluetoothDeviceFound) === null || _a === void 0 ? void 0 : _a.call(client, (event) => {
        var _a;
        for (const device of (_a = event.devices) !== null && _a !== void 0 ? _a : []) {
            const candidate = toCandidate(device);
            if (candidate) {
                devices.set(candidate.deviceId, candidate);
            }
        }
    });
    await callWx(client, 'startBluetoothDevicesDiscovery', {
        allowDuplicatesKey: false
    });
    await new Promise((resolve) => { var _a; return setTimeout(resolve, (_a = options.timeoutMs) !== null && _a !== void 0 ? _a : DISCOVERY_TIMEOUT_MS); });
    try {
        await callWx(client, 'stopBluetoothDevicesDiscovery');
    }
    catch (_b) {
        // Discovery may already be stopped by the system; the collected devices are still useful.
    }
    return Array.from(devices.values()).sort((left, right) => left.name.localeCompare(right.name));
}
async function connectReceiptPrinter(candidate, client = getWxClient()) {
    var _a, _b, _c;
    await callWx(client, 'openBluetoothAdapter');
    await callWx(client, 'createBLEConnection', {
        deviceId: candidate.deviceId
    });
    const servicesResponse = await callWx(client, 'getBLEDeviceServices', {
        deviceId: candidate.deviceId
    });
    for (const service of (_a = servicesResponse.services) !== null && _a !== void 0 ? _a : []) {
        const characteristicsResponse = await callWx(client, 'getBLEDeviceCharacteristics', {
            deviceId: candidate.deviceId,
            serviceId: service.uuid
        });
        const writable = (_b = characteristicsResponse.characteristics) === null || _b === void 0 ? void 0 : _b.find(isWritableCharacteristic);
        if (writable) {
            const connection = {
                deviceId: candidate.deviceId,
                name: candidate.name,
                serviceId: service.uuid,
                characteristicId: writable.uuid,
                connectedAt: new Date().toISOString()
            };
            (_c = client.setStorageSync) === null || _c === void 0 ? void 0 : _c.call(client, RECEIPT_PRINTER_STORAGE_KEY, connection);
            return connection;
        }
    }
    throw new Error('NO_WRITABLE_PRINTER_CHARACTERISTIC');
}
async function disconnectReceiptPrinter(connection = getStoredReceiptPrinterConnection(), client = getWxClient()) {
    if (connection) {
        try {
            await callWx(client, 'closeBLEConnection', {
                deviceId: connection.deviceId
            });
        }
        catch (_a) {
            // Local binding is cleared even if the connection was already closed.
        }
    }
    clearStoredReceiptPrinterConnection(client);
}
async function writeReceiptPrinterChunks(chunksBase64, connection = getStoredReceiptPrinterConnection(), client = getWxClient()) {
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
async function printReceiptPrinterSelfTest(connection = getStoredReceiptPrinterConnection(), client = getWxClient()) {
    await writeReceiptPrinterChunks(SELF_TEST_CHUNKS_BASE64, connection, client);
}
