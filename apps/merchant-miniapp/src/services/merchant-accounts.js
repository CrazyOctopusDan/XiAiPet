"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMerchantAccountWorkspace = formatMerchantAccountWorkspace;
exports.listMerchantAccounts = listMerchantAccounts;
exports.createStaffAccount = createStaffAccount;
exports.disableStaffAccount = disableStaffAccount;
exports.resetStaffPassword = resetStaffPassword;
const api_client_1 = require("./api-client");
function getAccountInitial(username) {
    return username.trim().charAt(0).toUpperCase() || '?';
}
function formatMerchantAccountWorkspace(accounts) {
    return {
        summary: {
            total: accounts.length,
            staff: accounts.filter((account) => account.role === 'staff').length,
            needsPasswordChange: accounts.filter((account) => account.mustChangePassword).length
        },
        items: accounts.map((account) => {
            const isDisabled = account.status === 'disabled';
            return {
                id: account.id,
                username: account.username,
                initial: getAccountInitial(account.username),
                roleLabel: account.role === 'admin' ? '管理员' : '员工',
                statusLabel: isDisabled ? '停用' : '启用',
                passwordLabel: account.mustChangePassword ? '需改密' : '已改密',
                statusTone: isDisabled ? 'disabled' : 'active',
                canManage: account.role === 'staff' && !isDisabled
            };
        })
    };
}
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
