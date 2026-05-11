"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMerchantAccess = verifyMerchantAccess;
const api_client_1 = require("./api-client");
async function verifyMerchantAccess(request = api_client_1.merchantApiRequest) {
    return request('/api/v1/merchant/access', {
        method: 'GET',
        auth: 'customer'
    });
}
