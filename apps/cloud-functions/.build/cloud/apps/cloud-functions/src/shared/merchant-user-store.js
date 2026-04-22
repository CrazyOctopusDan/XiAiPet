"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMerchantUserStore = createMerchantUserStore;
function getCloudDatabase() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        return cloud.database?.();
    }
    catch (error) {
        return undefined;
    }
}
function createMerchantUserStore() {
    return {
        async getByOpenid(openid) {
            const db = getCloudDatabase();
            if (!db) {
                return null;
            }
            const result = await db.collection('merchant_users').where({ openid }).get();
            return result.data[0] ?? null;
        }
    };
}
