"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRechargePlansConfig = normalizeRechargePlansConfig;
exports.summarizeUserGiftStatus = summarizeUserGiftStatus;
function isRecord(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function asString(value, fallback = '') {
    return typeof value === 'string' ? value.trim() : fallback;
}
function asMoney(value) {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? Math.floor(numberValue * 100) / 100 : 0;
}
function asDays(value) {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? Math.trunc(numberValue) : 0;
}
function normalizeGift(value, index) {
    if (!isRecord(value)) {
        throw new Error('INVALID_RECHARGE_GIFT');
    }
    const gift = {
        giftTemplateId: asString(value.giftTemplateId, asString(value.id, `gift-${index + 1}`)),
        name: asString(value.name),
        description: asString(value.description),
        validDays: asDays(value.validDays)
    };
    if (!gift.giftTemplateId || !gift.name || gift.validDays <= 0) {
        throw new Error('INVALID_RECHARGE_GIFT');
    }
    return gift;
}
function normalizePlan(value, index) {
    if (!isRecord(value)) {
        throw new Error('INVALID_RECHARGE_PLAN');
    }
    const plan = {
        planId: asString(value.planId, asString(value.id, `plan-${index + 1}`)),
        enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
        paidAmount: asMoney(value.paidAmount),
        bonusAmount: asMoney(value.bonusAmount),
        description: asString(value.description)
    };
    if (!plan.planId || plan.paidAmount <= 0 || plan.bonusAmount < 0) {
        throw new Error('INVALID_RECHARGE_PLAN');
    }
    return {
        ...plan,
        gifts: Array.isArray(value.gifts) ? value.gifts.map(normalizeGift) : []
    };
}
function normalizeRechargePlansConfig(input) {
    if (!isRecord(input)) {
        return { plans: [] };
    }
    const plans = Array.isArray(input.plans) ? input.plans.map(normalizePlan) : [];
    return { plans };
}
function summarizeUserGiftStatus(gift, now = new Date()) {
    if (gift.status === 'redeemed')
        return 'redeemed';
    if (gift.status === 'locked')
        return 'locked';
    const expiresAt = new Date(gift.expiresAt);
    return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime() ? 'expired' : 'available';
}
