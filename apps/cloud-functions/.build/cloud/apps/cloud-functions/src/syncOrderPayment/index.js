"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const auth_context_1 = require("../shared/auth-context");
const env_1 = require("../shared/env");
const payment_store_1 = require("../shared/payment-store");
async function main(event = {}, context, store = (0, payment_store_1.createPaymentStore)()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const auth = (0, auth_context_1.getAuthContext)(event, context);
    if (!event.orderId) {
        throw new Error('ORDER_NOT_FOUND');
    }
    const order = await store.getOrderById(event.orderId);
    if (!order) {
        throw new Error('ORDER_NOT_FOUND');
    }
    if (order.openid !== auth.openid) {
        throw new Error('ORDER_FORBIDDEN');
    }
    if (order.status === 'paid') {
        return {
            ok: true,
            order
        };
    }
    if (order.paymentMethod !== 'wechat') {
        return {
            ok: true,
            order
        };
    }
    const config = await store.getWechatPayConfig();
    if (!config.enabled) {
        return {
            ok: true,
            order
        };
    }
    const latestOrder = {
        ...order,
        updatedAt: event.now ?? new Date().toISOString()
    };
    return {
        ok: true,
        order: await store.saveOrder(latestOrder)
    };
}
