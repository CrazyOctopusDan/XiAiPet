"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const auth_context_1 = require("../shared/auth-context");
const env_1 = require("../shared/env");
const payment_store_1 = require("../shared/payment-store");
async function main(event = {}, context, store = (0, payment_store_1.createPaymentStore)()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const auth = (0, auth_context_1.getAuthContext)(event, context);
    const orders = await store.listOrdersByOpenid(auth.openid);
    return {
        ok: true,
        orders: [...orders].sort((left, right) => {
            const createdAtDiff = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
            if (createdAtDiff !== 0) {
                return createdAtDiff;
            }
            return right.id.localeCompare(left.id);
        })
    };
}
