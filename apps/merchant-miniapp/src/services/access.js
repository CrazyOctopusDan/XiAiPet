"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMerchantAccess = verifyMerchantAccess;
const api_client_1 = require("./api-client");
async function verifyMerchantAccess(request = api_client_1.merchantApiRequest) {
    try {
        return await request('/api/v1/merchant/access', {
            method: 'GET',
            auth: 'merchant'
        });
    }
    catch (error) {
        if (error instanceof api_client_1.MerchantApiError && (error.statusCode === 403 || error.code === 'MERCHANT_FORBIDDEN')) {
            return {
                ok: true,
                status: 'denied',
                allowed: false,
                reason: error.message || '当前账号没有商户权限'
            };
        }
        throw error;
    }
}
