"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMerchantUserSearchInput = isMerchantUserSearchInput;
exports.isMerchantUserSearchResult = isMerchantUserSearchResult;
exports.isMerchantUserBalanceAdjustmentPayload = isMerchantUserBalanceAdjustmentPayload;
const user_admin_1 = require("../types/user-admin");
function hasOnlyKeys(value, keys) {
    const valueKeys = Object.keys(value).sort();
    const expectedKeys = [...keys].sort();
    return (valueKeys.length === expectedKeys.length &&
        valueKeys.every((key, index) => key === expectedKeys[index]));
}
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function isFiniteBalance(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function toMinorUnits(value) {
    return Math.round(value * 100);
}
function isMerchantBalanceAdjustmentOperator(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return (hasOnlyKeys(candidate, ['openid', 'name']) &&
        isNonEmptyString(candidate.openid) &&
        isNonEmptyString(candidate.name));
}
function isReasonAllowedForAction(action, reasonType) {
    const reasons = action === 'deduct'
        ? user_admin_1.MERCHANT_BALANCE_ADJUSTMENT_DEDUCT_REASON_TYPES
        : user_admin_1.MERCHANT_BALANCE_ADJUSTMENT_ADD_REASON_TYPES;
    return typeof reasonType === 'string' && reasons.includes(reasonType);
}
function isMerchantUserSearchListItem(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return (hasOnlyKeys(candidate, [
        'openid',
        'avatarUrl',
        'nickname',
        'contactPhoneMasked',
        'membershipTierLabel',
        'currentBalance'
    ]) &&
        isNonEmptyString(candidate.openid) &&
        isNonEmptyString(candidate.avatarUrl) &&
        isNonEmptyString(candidate.nickname) &&
        isNonEmptyString(candidate.contactPhoneMasked) &&
        isNonEmptyString(candidate.membershipTierLabel) &&
        isFiniteBalance(candidate.currentBalance));
}
function isMerchantUserSearchInput(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return (hasOnlyKeys(candidate, ['query', 'searchField']) &&
        isNonEmptyString(candidate.query) &&
        user_admin_1.MERCHANT_USER_SEARCH_FIELDS.includes(candidate.searchField));
}
function isMerchantUserSearchResult(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return (hasOnlyKeys(candidate, ['users']) &&
        Array.isArray(candidate.users) &&
        candidate.users.every((item) => isMerchantUserSearchListItem(item)));
}
function isMerchantUserBalanceAdjustmentPayload(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    if (!hasOnlyKeys(candidate, [
        'userOpenid',
        'action',
        'reasonType',
        'note',
        'operator',
        'operatedAt',
        'beforeBalance',
        'delta',
        'targetBalance',
        'afterBalance',
        'requiresConfirmation'
    ]) ||
        !isNonEmptyString(candidate.userOpenid) ||
        !user_admin_1.MERCHANT_BALANCE_ADJUSTMENT_ACTIONS.includes(candidate.action) ||
        !user_admin_1.MERCHANT_BALANCE_ADJUSTMENT_REASON_TYPES.includes(candidate.reasonType) ||
        !isReasonAllowedForAction(candidate.action, candidate.reasonType) ||
        !isNonEmptyString(candidate.note) ||
        !isMerchantBalanceAdjustmentOperator(candidate.operator) ||
        !isNonEmptyString(candidate.operatedAt) ||
        !isFiniteBalance(candidate.beforeBalance) ||
        typeof candidate.delta !== 'number' ||
        !Number.isFinite(candidate.delta) ||
        !isFiniteBalance(candidate.targetBalance) ||
        !isFiniteBalance(candidate.afterBalance) ||
        candidate.requiresConfirmation !== true) {
        return false;
    }
    const beforeBalance = toMinorUnits(candidate.beforeBalance);
    const delta = toMinorUnits(candidate.delta);
    const targetBalance = toMinorUnits(candidate.targetBalance);
    const afterBalance = toMinorUnits(candidate.afterBalance);
    if (targetBalance !== afterBalance || beforeBalance + delta !== targetBalance) {
        return false;
    }
    if (candidate.action === 'add') {
        return delta > 0 && targetBalance >= beforeBalance;
    }
    if (candidate.action === 'deduct') {
        return delta < 0 && targetBalance <= beforeBalance;
    }
    return targetBalance === afterBalance && delta === targetBalance - beforeBalance;
}
