"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
const order_store_1 = require("../shared/order-store");
const order_receipt_print_1 = require("../shared/order-receipt-print");
async function main(event = {}, context, store = (0, order_store_1.createOrderStore)()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    if (!event.orderId) {
        throw new Error('ORDER_NOT_FOUND');
    }
    const order = await store.getById(event.orderId);
    if (!order) {
        throw new Error('ORDER_NOT_FOUND');
    }
    const now = event.now ?? new Date().toISOString();
    return {
        ok: true,
        job: (0, order_receipt_print_1.createReceiptPrintJob)(order, now)
    };
}
