"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const user_admin_1 = require("../../../../packages/shared/src/schema/user-admin");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
const payment_store_1 = require("../shared/payment-store");
async function main(event = {}, context, store = (0, payment_store_1.createPaymentStore)()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    if (!(0, user_admin_1.isMerchantUserBalanceAdjustmentPayload)(event.payload)) {
        throw new Error('INVALID_BALANCE_ADJUSTMENT');
    }
    const result = await store.applyMerchantBalanceAdjustment(event.payload);
    if ('error' in result) {
        throw new Error(result.error);
    }
    return {
        ok: true,
        balanceAfter: result.balanceAfter,
        ledger: result.ledger
    };
}
