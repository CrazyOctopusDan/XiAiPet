"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryMerchantUsers = queryMerchantUsers;
exports.getUsersPageViewModel = getUsersPageViewModel;
exports.getCachedLatestAdjustment = getCachedLatestAdjustment;
exports.getUserDetailViewModel = getUserDetailViewModel;
exports.buildBalanceAdjustmentDraft = buildBalanceAdjustmentDraft;
exports.submitBalanceAdjustment = submitBalanceAdjustment;
const api_client_1 = require("./api-client");
const USER_DETAIL_CACHE_KEY = 'merchant-user-detail-cache';
function formatMoney(value) {
    return `￥${value.toFixed(2)}`;
}
function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}
function readUserDetailCache() {
    var _a;
    try {
        return (_a = wx.getStorageSync(USER_DETAIL_CACHE_KEY)) !== null && _a !== void 0 ? _a : {};
    }
    catch (error) {
        return {};
    }
}
function writeUserDetailCache(cache, storage) {
    if (storage) {
        storage(USER_DETAIL_CACHE_KEY, cache);
        return;
    }
    wx.setStorageSync(USER_DETAIL_CACHE_KEY, cache);
}
function getCurrentMerchantOperator() {
    var _a;
    const account = (_a = (0, api_client_1.getMerchantSession)()) === null || _a === void 0 ? void 0 : _a.account;
    if (!(account === null || account === void 0 ? void 0 : account.id) || !account.username) {
        throw new api_client_1.MerchantApiError('MERCHANT_LOGIN_REQUIRED', '请先登录商户账号', 401);
    }
    return {
        openid: account.id,
        name: account.username
    };
}
async function queryMerchantUsers(input, request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/users', {
        method: 'GET',
        query: {
            query: input.query,
            searchField: input.searchField
        },
        auth: 'merchant'
    });
    return (_a = response.users) !== null && _a !== void 0 ? _a : [];
}
function getUsersPageViewModel(users) {
    return {
        isEmpty: users.length === 0,
        cards: users.map((user) => ({
            openid: user.openid,
            avatarUrl: user.avatarUrl,
            nickname: user.nickname,
            contactPhoneMasked: user.contactPhoneMasked,
            membershipTierLabel: user.membershipTierLabel,
            currentBalanceLabel: formatMoney(user.currentBalance)
        }))
    };
}
function getCachedLatestAdjustment(userOpenid) {
    var _a;
    return (_a = readUserDetailCache()[userOpenid]) !== null && _a !== void 0 ? _a : null;
}
function getUserDetailViewModel(user, latest) {
    var _a, _b;
    return {
        openid: user.openid,
        avatarUrl: user.avatarUrl,
        nickname: user.nickname,
        membershipTierLabel: user.membershipTierLabel,
        contactPhoneMasked: user.contactPhoneMasked,
        currentBalanceLabel: formatMoney(user.currentBalance),
        latestOperationTitle: (_a = latest === null || latest === void 0 ? void 0 : latest.normalizedTitle) !== null && _a !== void 0 ? _a : '暂无最近操作',
        latestOperationNote: (_b = latest === null || latest === void 0 ? void 0 : latest.shortNote) !== null && _b !== void 0 ? _b : '还没有余额调整记录',
        latestOperationMeta: latest ? `${latest.operatorName} · ${formatDateTime(latest.operatedAt)}` : '等待第一次调整'
    };
}
function buildBalanceAdjustmentDraft(user, input) {
    const parsedAmount = Number(input.amountText || 0);
    const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
    let delta = 0;
    let targetBalance = user.currentBalance;
    if (input.action === 'add') {
        delta = amount;
        targetBalance = user.currentBalance + amount;
    }
    else if (input.action === 'deduct') {
        delta = -amount;
        targetBalance = user.currentBalance - amount;
    }
    else {
        targetBalance = amount;
        delta = amount - user.currentBalance;
    }
    const disableSubmitReason = targetBalance < 0
        ? '调整后余额不能小于 0'
        : !input.note.trim()
            ? '请填写备注'
            : amount <= 0
                ? input.action === 'set'
                    ? '请输入目标余额'
                    : '请输入调整金额'
                : null;
    return {
        user,
        action: input.action,
        amountText: input.amountText,
        amount,
        reasonType: input.reasonType,
        note: input.note,
        beforeBalance: user.currentBalance,
        delta,
        targetBalance,
        afterBalance: targetBalance,
        resultingBalanceLabel: formatMoney(targetBalance),
        disableSubmitReason
    };
}
async function submitBalanceAdjustment(draft, request = api_client_1.merchantApiRequest, storage) {
    const operator = getCurrentMerchantOperator();
    const payload = {
        userOpenid: draft.user.openid,
        action: draft.action,
        reasonType: draft.reasonType,
        note: draft.note.trim(),
        operator,
        operatedAt: new Date().toISOString(),
        beforeBalance: draft.beforeBalance,
        delta: draft.delta,
        targetBalance: draft.targetBalance,
        afterBalance: draft.afterBalance,
        requiresConfirmation: true
    };
    const response = await request(`/api/v1/merchant/users/${draft.user.openid}/balance-adjustments`, {
        method: 'POST',
        body: payload,
        auth: 'merchant'
    });
    const cache = readUserDetailCache();
    cache[draft.user.openid] = {
        normalizedTitle: response.ledger.normalizedTitle,
        shortNote: response.ledger.shortNote,
        operatedAt: payload.operatedAt,
        operatorName: operator.name
    };
    writeUserDetailCache(cache, storage);
    return response;
}
