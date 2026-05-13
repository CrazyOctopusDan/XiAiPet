"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMerchantAccounts = listMerchantAccounts;
exports.createStaffAccount = createStaffAccount;
exports.disableStaffAccount = disableStaffAccount;
exports.resetStaffPassword = resetStaffPassword;
const api_client_1 = require("./api-client");
async function listMerchantAccounts(request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/accounts', {
        method: 'GET',
        auth: 'merchant'
    });
    return (_a = response.accounts) !== null && _a !== void 0 ? _a : [];
}
async function createStaffAccount(username, request = api_client_1.merchantApiRequest) {
    return request('/api/v1/merchant/accounts/staff', {
        method: 'POST',
        body: { username },
        auth: 'merchant'
    });
}
async function disableStaffAccount(accountId, request = api_client_1.merchantApiRequest) {
    return request(`/api/v1/merchant/accounts/${accountId}/disable`, {
        method: 'PATCH',
        auth: 'merchant'
    });
}
async function resetStaffPassword(accountId, request = api_client_1.merchantApiRequest) {
    return request(`/api/v1/merchant/accounts/${accountId}/reset-password`, {
        method: 'POST',
        auth: 'merchant'
    });
}
