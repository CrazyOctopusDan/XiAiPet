"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const shared_1 = require("@xiaipet/shared");
const auth_context_1 = require("../shared/auth-context");
const env_1 = require("../shared/env");
const merchant_user_store_1 = require("../shared/merchant-user-store");
async function resolveMerchantUser(event, openid, store) {
    const merchantUserFromStore = await store.getByOpenid(openid);
    if (merchantUserFromStore) {
        return merchantUserFromStore;
    }
    const merchantUserFromEvent = (0, shared_1.isMerchantUserRecord)(event.merchantUser) ? event.merchantUser : null;
    if (merchantUserFromEvent?.openid === openid) {
        return merchantUserFromEvent;
    }
    return null;
}
async function main(event = {}, context, store = (0, merchant_user_store_1.createMerchantUserStore)()) {
    (0, env_1.resolveRuntimeEnv)();
    const auth = (0, auth_context_1.getAuthContext)(event, context);
    const merchantUser = await resolveMerchantUser(event, auth.openid, store);
    if (!merchantUser || merchantUser.openid !== auth.openid || !merchantUser.enabled) {
        return {
            ok: true,
            status: 'denied',
            allowed: false,
            reason: '当前账号还未加入 merchant_users 白名单'
        };
    }
    return {
        ok: true,
        status: 'allowed',
        allowed: true,
        merchant: {
            merchantId: merchantUser.merchantId,
            storeName: merchantUser.storeName
        },
        merchantUser
    };
}
