"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalanceAdjustmentReasonOptions = getBalanceAdjustmentReasonOptions;
exports.getBalanceLedgerViewModels = getBalanceLedgerViewModels;
exports.getAddressViewModels = getAddressViewModels;
exports.queryMerchantUsers = queryMerchantUsers;
exports.fetchMerchantUserDetail = fetchMerchantUserDetail;
exports.fetchMerchantUserAddresses = fetchMerchantUserAddresses;
exports.fetchMerchantUserBalanceLedgers = fetchMerchantUserBalanceLedgers;
exports.getUsersPageViewModel = getUsersPageViewModel;
exports.getCachedLatestAdjustment = getCachedLatestAdjustment;
exports.getUserDetailViewModel = getUserDetailViewModel;
exports.buildBalanceAdjustmentDraft = buildBalanceAdjustmentDraft;
exports.submitBalanceAdjustment = submitBalanceAdjustment;
const api_client_1 = require("./api-client");
const USER_DETAIL_CACHE_KEY = 'merchant-user-detail-cache';
const ADD_REASON_OPTIONS = ['充值', '线下收款', '赠送', '优惠券', '其他'];
const DEDUCT_REASON_OPTIONS = ['退款', '取消赠送', '其他'];
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
    try {
        const cache = wx.getStorageSync(USER_DETAIL_CACHE_KEY);
        if (!cache || typeof cache !== 'object' || Array.isArray(cache)) {
            return {};
        }
        return cache;
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
function getBalanceAdjustmentShortNote(delta) {
    if (delta > 0) {
        return `增加 ${formatMoney(delta)}`;
    }
    if (delta < 0) {
        return `扣减 ${formatMoney(Math.abs(delta))}`;
    }
    return '余额未变化';
}
function normalizeMoney(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.floor(value * 100) / 100;
}
function normalizeBalanceAdjustmentAction(action) {
    return action === 'deduct' ? 'deduct' : 'add';
}
function getBalanceAdjustmentReasonOptions(action) {
    return [...(action === 'deduct' ? DEDUCT_REASON_OPTIONS : ADD_REASON_OPTIONS)];
}
function normalizeBalanceAdjustmentReason(action, reasonType) {
    const options = getBalanceAdjustmentReasonOptions(action);
    return options.includes(reasonType) ? reasonType : options[0];
}
function getContactPhoneLabel(user) {
    var _a;
    return ((_a = user.contactPhone) === null || _a === void 0 ? void 0 : _a.trim()) || user.contactPhoneMasked || '未留手机号';
}
function getAmountTone(amount) {
    if (amount > 0) {
        return 'income';
    }
    if (amount < 0) {
        return 'expense';
    }
    return 'neutral';
}
function getAmountLabel(amount) {
    if (amount > 0) {
        return `+${formatMoney(amount)}`;
    }
    if (amount < 0) {
        return `-${formatMoney(Math.abs(amount))}`;
    }
    return formatMoney(0);
}
function getBalanceLedgerViewModels(ledgers = []) {
    return ledgers.map((ledger) => ({
        id: ledger.id,
        title: ledger.normalizedTitle,
        note: ledger.shortNote,
        amountLabel: getAmountLabel(ledger.amountDelta),
        balanceAfterLabel: `余额 ${formatMoney(ledger.balanceAfter)}`,
        meta: `${ledger.operatorName} · ${formatDateTime(ledger.operatedAt)}`,
        tone: getAmountTone(ledger.amountDelta)
    }));
}
function getAddressViewModels(addresses = []) {
    return addresses.map((address) => ({
        id: address.id,
        typeLabel: address.type === 'express' ? '快递地址' : '配送地址',
        recipientLabel: address.recipientName,
        phoneLabel: address.phoneNumber,
        addressLabel: `${address.regionLabel} ${address.detailAddress}`,
        tagLabel: address.tag || '未设置标签',
        isDefault: address.isDefault
    }));
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
async function fetchMerchantUserDetail(openid, request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request(`/api/v1/merchant/users/${openid}`, {
        method: 'GET',
        auth: 'merchant'
    });
    return (_a = response.user) !== null && _a !== void 0 ? _a : null;
}
async function fetchMerchantUserAddresses(openid, request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request(`/api/v1/merchant/users/${openid}/addresses`, {
        method: 'GET',
        auth: 'merchant'
    });
    return (_a = response.addresses) !== null && _a !== void 0 ? _a : [];
}
async function fetchMerchantUserBalanceLedgers(openid, pagination = {}, request = api_client_1.merchantApiRequest) {
    var _a, _b, _c, _d, _e, _f, _g;
    const response = await request(`/api/v1/merchant/users/${openid}/balance-ledgers`, {
        method: 'GET',
        query: {
            cursor: (_a = pagination.cursor) !== null && _a !== void 0 ? _a : '0',
            limit: String((_b = pagination.limit) !== null && _b !== void 0 ? _b : 20)
        },
        auth: 'merchant'
    });
    return {
        records: (_c = response.records) !== null && _c !== void 0 ? _c : [],
        pagination: (_d = response.pagination) !== null && _d !== void 0 ? _d : {
            nextCursor: null,
            hasMore: false,
            limit: (_e = pagination.limit) !== null && _e !== void 0 ? _e : 20,
            total: (_g = (_f = response.records) === null || _f === void 0 ? void 0 : _f.length) !== null && _g !== void 0 ? _g : 0
        }
    };
}
function getUsersPageViewModel(users) {
    return {
        isEmpty: users.length === 0,
        summary: {
            totalUsers: users.length,
            totalBalanceLabel: formatMoney(users.reduce((sum, user) => sum + user.currentBalance, 0)),
            tierCount: new Set(users.map((user) => user.membershipTierLabel)).size
        },
        cards: users.map((user) => ({
            openid: user.openid,
            avatarUrl: user.avatarUrl,
            nickname: user.nickname,
            contactPhoneLabel: getContactPhoneLabel(user),
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
    var _a, _b, _c, _d, _e, _f;
    const detailUser = user;
    const addressRows = getAddressViewModels((_a = detailUser.addresses) !== null && _a !== void 0 ? _a : []);
    const ledgerRows = getBalanceLedgerViewModels((_b = detailUser.balanceLedgers) !== null && _b !== void 0 ? _b : []);
    const addressCount = (_c = detailUser.addressCount) !== null && _c !== void 0 ? _c : addressRows.length;
    const balanceLedgerCount = (_d = detailUser.balanceLedgerCount) !== null && _d !== void 0 ? _d : ledgerRows.length;
    const contactPhoneLabel = getContactPhoneLabel(user);
    return {
        openid: user.openid,
        avatarUrl: user.avatarUrl,
        nickname: user.nickname,
        membershipTierLabel: user.membershipTierLabel,
        contactPhoneLabel,
        currentBalanceLabel: formatMoney(user.currentBalance),
        latestOperationTitle: (_e = latest === null || latest === void 0 ? void 0 : latest.normalizedTitle) !== null && _e !== void 0 ? _e : '暂无最近操作',
        latestOperationNote: (_f = latest === null || latest === void 0 ? void 0 : latest.shortNote) !== null && _f !== void 0 ? _f : '还没有余额调整记录',
        latestOperationMeta: latest ? `${latest.operatorName} · ${formatDateTime(latest.operatedAt)}` : '等待第一次调整',
        basicRows: [
            { label: '昵称', value: user.nickname },
            { label: '手机号', value: contactPhoneLabel },
            { label: '会员等级', value: user.membershipTierLabel }
        ],
        addressRows,
        ledgerRows,
        detailTabs: [
            { key: 'basic', label: '基本信息', countLabel: '3' },
            { key: 'addresses', label: '地址信息', countLabel: String(addressCount) },
            { key: 'ledger', label: '余额流水', countLabel: String(balanceLedgerCount) }
        ]
    };
}
function buildBalanceAdjustmentDraft(user, input) {
    const action = normalizeBalanceAdjustmentAction(input.action);
    const reasonType = normalizeBalanceAdjustmentReason(action, input.reasonType);
    const parsedAmount = Number(input.amountText || 0);
    const amount = normalizeMoney(parsedAmount);
    let delta = 0;
    let targetBalance = user.currentBalance;
    if (action === 'add') {
        delta = amount;
        targetBalance = user.currentBalance + amount;
    }
    else {
        delta = -amount;
        targetBalance = user.currentBalance - amount;
    }
    delta = normalizeMoney(delta);
    targetBalance = normalizeMoney(targetBalance);
    const disableSubmitReason = targetBalance < 0
        ? '调整后余额不能小于 0'
        : !input.note.trim()
            ? '请填写备注'
            : amount <= 0
                ? '请输入调整金额'
                : null;
    return {
        user,
        action,
        amountText: input.amountText,
        amount,
        reasonType,
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
    var _a, _b, _c;
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
    const responseLedger = (_a = response.ledger) !== null && _a !== void 0 ? _a : {};
    const cache = readUserDetailCache();
    cache[draft.user.openid] = {
        normalizedTitle: (_b = responseLedger.normalizedTitle) !== null && _b !== void 0 ? _b : draft.reasonType,
        shortNote: (_c = responseLedger.shortNote) !== null && _c !== void 0 ? _c : getBalanceAdjustmentShortNote(draft.delta),
        operatedAt: payload.operatedAt,
        operatorName: operator.name
    };
    writeUserDetailCache(cache, storage);
    return response;
}
