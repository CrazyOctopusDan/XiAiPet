"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMerchantUserRecord = isMerchantUserRecord;
function isMerchantUserRecord(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return (typeof candidate.openid === 'string' &&
        typeof candidate.merchantId === 'string' &&
        typeof candidate.storeName === 'string' &&
        typeof candidate.enabled === 'boolean' &&
        typeof candidate.grantedAt === 'string');
}
