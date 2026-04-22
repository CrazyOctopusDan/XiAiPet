"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const user_admin_1 = require("../../../../packages/shared/src/schema/user-admin");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
function createMerchantUserSearchRepository() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        const db = cloud.database?.();
        return {
            async searchUsers(input) {
                if (!db) {
                    return [];
                }
                const users = (await db.collection('users').get()).data ?? [];
                const accounts = (await db.collection('balance_accounts').get()).data ?? [];
                const query = input.query.trim();
                return users
                    .filter((user) => {
                    if (input.searchField === 'phone') {
                        return String(user.contactPhoneMasked ?? '').includes(query) || String(user.contactPhone ?? '').includes(query);
                    }
                    return String(user.nickname ?? '').includes(query);
                })
                    .map((user) => ({
                    openid: String(user.openid ?? ''),
                    avatarUrl: String(user.avatarUrl ?? ''),
                    nickname: String(user.nickname ?? ''),
                    contactPhoneMasked: String(user.contactPhoneMasked ?? ''),
                    membershipTierLabel: String(user.membershipTierLabel ?? '普通会员'),
                    currentBalance: Number(accounts.find((account) => account.openid === user.openid)?.balance ?? 0)
                }));
            }
        };
    }
    catch (error) {
        return {
            async searchUsers() {
                return [];
            }
        };
    }
}
async function main(event = {}, context, repository = createMerchantUserSearchRepository()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    if (!(0, user_admin_1.isMerchantUserSearchInput)(event.input)) {
        throw new Error('INVALID_SEARCH_INPUT');
    }
    return {
        ok: true,
        users: await repository.searchUsers(event.input)
    };
}
