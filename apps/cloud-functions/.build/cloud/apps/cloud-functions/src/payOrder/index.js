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
        throw new Error('Invalid pay-order payload');
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
            paymentStatus: 'paid',
            order
        };
    }
    if (order.paymentMethod === 'wechat') {
        const config = await store.getWechatPayConfig();
        if (!config.enabled || !config.appid || !config.mchid || !config.notifyUrl) {
            return {
                ok: false,
                code: 'WECHAT_PAY_NOT_CONFIGURED',
                order
            };
        }
        const processingOrder = {
            ...order,
            status: 'payment_processing',
            payment: {
                method: 'wechat',
                status: 'processing'
            },
            updatedAt: event.now ?? new Date().toISOString()
        };
        const savedOrder = await store.saveOrder(processingOrder);
        return {
            ok: true,
            paymentStatus: 'processing',
            order: savedOrder,
            paymentParams: {
                timeStamp: String(Date.now()),
                nonceStr: `nonce-${savedOrder.id}`,
                package: `prepay_id=${savedOrder.id}`,
                signType: 'RSA',
                paySign: 'pending-config'
            }
        };
    }
    const result = await store.finalizeBalancePayment(order, event.now ?? new Date().toISOString());
    if ('error' in result) {
        return {
            ok: false,
            code: result.error,
            order
        };
    }
    return {
        ok: true,
        paymentStatus: 'paid',
        order: result.order,
        balanceAfter: result.balanceAfter
    };
}
