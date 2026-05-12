"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMerchantUserStore = createMerchantUserStore;
function getCloudDatabase() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.({
            env: process.env.CLOUDBASE_ENV_ID || cloud.DYNAMIC_CURRENT_ENV
        });
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
            try {
                const result = await db.collection('merchant_users').where({ openid }).get();
                console.info('merchant_users query completed', {
                    openid,
                    envId: process.env.CLOUDBASE_ENV_ID,
                    count: result.data.length
                });
                return result.data[0] ?? null;
            }
            catch (error) {
                console.warn('merchant_users query failed', {
                    openid,
                    envId: process.env.CLOUDBASE_ENV_ID,
                    message: error instanceof Error ? error.message : String(error)
                });
                return null;
            }
        }
    };
}
