"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const shared_1 = require("@xiaipet/shared");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
const order_store_1 = require("../shared/order-store");
const order_receipt_print_1 = require("../shared/order-receipt-print");
function toAuditPayloadCandidate(event) {
    return {
        orderId: event.orderId,
        operator: event.operator,
        printedAt: event.printedAt,
        printerDeviceId: event.printerDeviceId,
        printerDeviceLabel: event.printerDeviceLabel,
        receiptTemplateVersion: event.receiptTemplateVersion,
        result: event.result,
        failureReason: event.failureReason,
        isReprint: event.isReprint
    };
}
async function main(event = {}, context, store = (0, order_store_1.createOrderStore)()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    const payload = toAuditPayloadCandidate(event);
    if (!(0, shared_1.isOrderReceiptPrintAuditPayload)(payload)) {
        throw new Error('INVALID_PRINT_AUDIT');
    }
    const order = (await store.getById(payload.orderId));
    if (!order) {
        throw new Error('ORDER_NOT_FOUND');
    }
    return {
        ok: true,
        order: await store.save((0, order_receipt_print_1.applyReceiptPrintAudit)(order, payload))
    };
}
