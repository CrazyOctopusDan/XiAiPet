"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRechargePlansDraft = normalizeRechargePlansDraft;
exports.normalizeRechargeMoneyInputText = normalizeRechargeMoneyInputText;
exports.parseRechargeMoneyInput = parseRechargeMoneyInput;
exports.parseRechargeGiftValidDaysInput = parseRechargeGiftValidDaysInput;
exports.queryRechargePlans = queryRechargePlans;
exports.saveRechargePlans = saveRechargePlans;
exports.buildRechargePlanDraft = buildRechargePlanDraft;
exports.buildRechargeGiftDraft = buildRechargeGiftDraft;
exports.getRechargeConfigViewModel = getRechargeConfigViewModel;
const recharge_schema_1 = require("../shared/recharge-schema");
const api_client_1 = require("./api-client");
let draftIdSequence = 0;
function createDraftId(prefix) {
    draftIdSequence = (draftIdSequence + 1) % Number.MAX_SAFE_INTEGER;
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now()}-${draftIdSequence.toString(36)}-${randomPart}`;
}
function validateUniqueRechargeIds(value) {
    const planIds = new Set();
    value.plans.forEach((plan) => {
        if (planIds.has(plan.planId)) {
            throw new Error('DUPLICATE_RECHARGE_PLAN_ID');
        }
        planIds.add(plan.planId);
        const giftIds = new Set();
        plan.gifts.forEach((gift) => {
            if (giftIds.has(gift.giftTemplateId)) {
                throw new Error('DUPLICATE_RECHARGE_GIFT_ID');
            }
            giftIds.add(gift.giftTemplateId);
        });
    });
}
function normalizeRechargePlansDraft(input) {
    const normalized = (0, recharge_schema_1.normalizeRechargePlansConfig)(input);
    validateUniqueRechargeIds(normalized);
    return normalized;
}
function normalizeRechargeMoneyInputText(value) {
    const raw = value !== null && value !== void 0 ? value : '';
    if (raw.includes('-')) {
        return '';
    }
    const sanitized = raw.replace(/[^\d.]/g, '');
    const [integerPart = '', ...decimalParts] = sanitized.split('.');
    if (!sanitized.includes('.')) {
        return integerPart;
    }
    return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}
function parseRechargeMoneyInput(value) {
    const normalized = normalizeRechargeMoneyInputText(value);
    const numeric = Number(normalized);
    if (!normalized || !Number.isFinite(numeric) || numeric < 0) {
        return 0;
    }
    return Math.floor(numeric * 100) / 100;
}
function parseRechargeGiftValidDaysInput(value) {
    const raw = value !== null && value !== void 0 ? value : '';
    if (raw.includes('-')) {
        return 0;
    }
    const numeric = Number(raw.replace(/[^\d]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
    }
    return Math.trunc(numeric);
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
