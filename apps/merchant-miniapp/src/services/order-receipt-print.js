"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printOrderReceipt = printOrderReceipt;
const api_client_1 = require("./api-client");
const printer_1 = require("./printer");
function getCurrentMerchantOperator() {
    var _a;
    const account = (_a = (0, api_client_1.getMerchantSession)()) === null || _a === void 0 ? void 0 : _a.account;
    if (!(account === null || account === void 0 ? void 0 : account.id) || !account.username) {
        throw new api_client_1.MerchantApiError('MERCHANT_LOGIN_REQUIRED', '请先登录商户账号', 401);
    }
    return {
        id: account.id,
        name: account.username
    };
}
async function prepareReceiptPrintJob(orderId, request) {
    var _a;
    const response = await request(`/api/v1/merchant/orders/${orderId}/receipt-print/prepare`, {
        method: 'POST',
        body: {},
        auth: 'merchant'
    });
    const job = (_a = response.job) !== null && _a !== void 0 ? _a : response.print;
    if (!job) {
        throw new Error('PRINT_JOB_UNAVAILABLE');
    }
    return job;
}
async function recordReceiptPrintResult(job, operator, connection, result, request, printedAt, failureReason) {
    await request(`/api/v1/merchant/orders/${job.orderId}/receipt-print/result`, {
        method: 'POST',
        body: {
            orderId: job.orderId,
            operator,
            printedAt,
            printerDeviceId: connection.deviceId,
            printerDeviceLabel: connection.name,
            receiptTemplateVersion: job.receiptTemplateVersion,
            result,
            failureReason,
            isReprint: job.isReprint
        },
        auth: 'merchant'
    });
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : 'UNKNOWN_PRINT_ERROR';
}
async function printOrderReceipt(input, dependencies = {}) {
    var _a, _b, _c, _d;
    const request = (_a = dependencies.request) !== null && _a !== void 0 ? _a : api_client_1.merchantApiRequest;
    const operator = getCurrentMerchantOperator();
    const job = await prepareReceiptPrintJob(input.orderId, request);
    const connection = dependencies.getConnection ? dependencies.getConnection() : (0, printer_1.getStoredReceiptPrinterConnection)();
    const printedAt = (_c = (_b = dependencies.now) === null || _b === void 0 ? void 0 : _b.call(dependencies)) !== null && _c !== void 0 ? _c : new Date().toISOString();
    if (!connection) {
        await recordReceiptPrintResult(job, operator, {
            deviceId: 'unconfigured',
            name: '未配置打印机'
        }, 'failed', request, printedAt, 'NO_PRINTER_CONNECTED');
        throw new Error('NO_PRINTER_CONNECTED');
    }
    try {
        await ((_d = dependencies.writeChunks) !== null && _d !== void 0 ? _d : printer_1.writeReceiptPrinterChunks)(job.chunksBase64, connection);
        await recordReceiptPrintResult(job, operator, connection, 'success', request, printedAt);
        return job;
    }
    catch (error) {
        await recordReceiptPrintResult(job, operator, connection, 'failed', request, printedAt, getErrorMessage(error));
        throw error;
    }
}
