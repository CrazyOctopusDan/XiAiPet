"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMerchantAccess = verifyMerchantAccess;
async function verifyMerchantAccess() {
    return wx.cloud.callFunction({
        name: 'assertMerchantAccess',
        data: {}
    });
}
