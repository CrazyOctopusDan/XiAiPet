"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printOrderReceipt = printOrderReceipt;
const access_1 = require("./access");
const printer_1 = require("./printer");
function getCloudCaller() {
    return (payload) => wx.cloud.callFunction(payload);
}
async function resolveMerchantOperator(accessVerifier) {
    var _a, _b;
    const response = await accessVerifier();
    const access = (_a = response.result) !== null && _a !== void 0 ? _a : response;
    if (!access.allowed || !((_b = access.merchant) === null || _b === void 0 ? void 0 : _b.merchantId) || !access.merchant.storeName) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    return {
        id: access.merchant.merchantId,
        name: access.merchant.storeName
    };
}
async function prepareReceiptPrintJob(orderId, callFunction) {
    var _a;
    const response = (await callFunction({
        name: 'prepareOrderReceiptPrint',
        data: {
            orderId
        }
    }));
    if (!((_a = response.result) === null || _a === void 0 ? void 0 : _a.job)) {
        throw new Error('PRINT_JOB_UNAVAILABLE');
    }
    return response.result.job;
}
async function recordReceiptPrintResult(job, operator, connection, result, callFunction, printedAt, failureReason) {
    await callFunction({
        name: 'recordOrderReceiptPrintResult',
        data: {
            orderId: job.orderId,
            operator,
            printedAt,
            printerDeviceId: connection.deviceId,
            printerDeviceLabel: connection.name,
            receiptTemplateVersion: job.receiptTemplateVersion,
            result,
            failureReason,
            isReprint: job.isReprint
        }
    });
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : 'UNKNOWN_PRINT_ERROR';
}
async function printOrderReceipt(input, dependencies = {}) {
    var _a, _b, _c, _d, _e;
    const callFunction = (_a = dependencies.callFunction) !== null && _a !== void 0 ? _a : getCloudCaller();
    const operator = await resolveMerchantOperator((_b = dependencies.accessVerifier) !== null && _b !== void 0 ? _b : access_1.verifyMerchantAccess);
    const job = await prepareReceiptPrintJob(input.orderId, callFunction);
    const connection = dependencies.getConnection ? dependencies.getConnection() : (0, printer_1.getStoredReceiptPrinterConnection)();
    const printedAt = (_d = (_c = dependencies.now) === null || _c === void 0 ? void 0 : _c.call(dependencies)) !== null && _d !== void 0 ? _d : new Date().toISOString();
    if (!connection) {
        await recordReceiptPrintResult(job, operator, {
            deviceId: 'unconfigured',
            name: '未配置打印机'
        }, 'failed', callFunction, printedAt, 'NO_PRINTER_CONNECTED');
        throw new Error('NO_PRINTER_CONNECTED');
    }
    try {
        await ((_e = dependencies.writeChunks) !== null && _e !== void 0 ? _e : printer_1.writeReceiptPrinterChunks)(job.chunksBase64, connection);
        await recordReceiptPrintResult(job, operator, connection, 'success', callFunction, printedAt);
        return job;
    }
    catch (error) {
        await recordReceiptPrintResult(job, operator, connection, 'failed', callFunction, printedAt, getErrorMessage(error));
        throw error;
    }
}
