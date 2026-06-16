"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRechargePlansDraft = normalizeRechargePlansDraft;
exports.queryRechargePlans = queryRechargePlans;
exports.saveRechargePlans = saveRechargePlans;
exports.buildRechargePlanDraft = buildRechargePlanDraft;
exports.buildRechargeGiftDraft = buildRechargeGiftDraft;
exports.getRechargeConfigViewModel = getRechargeConfigViewModel;
const api_client_1 = require("./api-client");
function createDraftId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
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
function normalizeRechargePlansDraft(input) {
    if (!isRecord(input)) {
        return { plans: [] };
    }
    return {
        plans: Array.isArray(input.plans) ? input.plans.map(normalizePlan) : []
    };
}
async function queryRechargePlans(request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/recharge-plans', {
        method: 'GET',
        auth: 'merchant'
    });
    return (_a = response.plans) !== null && _a !== void 0 ? _a : [];
}
async function saveRechargePlans(value, request = api_client_1.merchantApiRequest) {
    var _a;
    const normalized = normalizeRechargePlansDraft(value);
    const response = await request('/api/v1/merchant/recharge-plans', {
        method: 'PUT',
        auth: 'merchant',
        body: normalized
    });
    return (_a = response.plans) !== null && _a !== void 0 ? _a : normalized.plans;
}
function buildRechargePlanDraft() {
    return {
        planId: createDraftId('plan'),
        enabled: true,
        paidAmount: 0,
        bonusAmount: 0,
        description: '',
        gifts: []
    };
}
function buildRechargeGiftDraft() {
    return {
        giftTemplateId: createDraftId('gift'),
        name: '',
        description: '',
        validDays: 365
    };
}
function getRechargeConfigViewModel(plans) {
    const enabledCount = plans.filter((plan) => plan.enabled).length;
    const totalGiftCount = plans.reduce((sum, plan) => sum + plan.gifts.length, 0);
    return {
        enabledCount,
        totalGiftCount,
        summaryLabel: `${enabledCount} 个启用档位 · ${totalGiftCount} 个赠品`,
        rows: plans.map((plan) => ({
            ...plan,
            summaryLabel: `充 ${plan.paidAmount} 送 ${plan.bonusAmount} + ${plan.gifts.length} 个赠品`
        }))
    };
}
