"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const env_1 = require("../shared/env");
async function main(event = {}) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    if (!event.order?.id || typeof event.order.pricing?.payableTotal !== 'number' || !event.paymentMethod) {
        throw new Error('Invalid create-payment payload');
    }
    if (event.paymentMethod === 'wechat') {
        return {
            ok: true,
            paymentStatus: 'pending_wechat',
            paymentParams: {
                nonceStr: `nonce-${event.order.id}`,
                package: `prepay_id=${event.order.id}`,
                signType: 'RSA'
            }
        };
    }
    if ((event.customerBalance ?? 0) < event.order.pricing.payableTotal) {
        return {
            ok: false,
            code: 'INSUFFICIENT_BALANCE',
            paymentStatus: 'blocked'
        };
    }
    return {
        ok: true,
        paymentStatus: 'paid',
        balanceAfter: Number(((event.customerBalance ?? 0) - event.order.pricing.payableTotal).toFixed(2))
    };
}
