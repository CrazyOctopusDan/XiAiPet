"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrateRechargePlans = hydrateRechargePlans;
exports.getRechargePlans = getRechargePlans;
exports.selectRechargePlan = selectRechargePlan;
exports.getSelectedRechargePlan = getSelectedRechargePlan;
exports.startRecharge = startRecharge;
exports.syncRechargeTransaction = syncRechargeTransaction;
const api_client_1 = require("./api-client");
let rechargePlans = [];
let selectedRechargePlanId = '';
function cloneRechargePlan(plan) {
    return {
        ...plan,
        gifts: plan.gifts.map((gift) => ({ ...gift }))
    };
}
function createRechargeIdempotencyKey() {
    return `recharge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function requestRechargePayment(paymentParams) {
    return new Promise((resolve, reject) => {
        if (typeof wx === 'undefined' || typeof wx.requestPayment !== 'function') {
            reject(new Error('WECHAT_PAY_UNAVAILABLE'));
            return;
        }
        wx.requestPayment({
            ...paymentParams,
            success: () => resolve(),
            fail: () => reject(new Error('WECHAT_PAY_CANCELLED'))
        });
    });
}
async function hydrateRechargePlans(request = api_client_1.customerApiRequest) {
    var _a, _b, _c;
    const response = await request('/api/v1/customer/recharge-plans', {
        method: 'GET',
        auth: 'customer'
    });
    rechargePlans = ((_a = response.plans) !== null && _a !== void 0 ? _a : []).map(cloneRechargePlan);
    if (!rechargePlans.some((plan) => plan.planId === selectedRechargePlanId)) {
        selectedRechargePlanId = (_c = (_b = rechargePlans[0]) === null || _b === void 0 ? void 0 : _b.planId) !== null && _c !== void 0 ? _c : '';
    }
    return getRechargePlans();
}
function getRechargePlans() {
    return rechargePlans.map(cloneRechargePlan);
}
function selectRechargePlan(planId) {
    if (rechargePlans.some((plan) => plan.planId === planId)) {
        selectedRechargePlanId = planId;
    }
    return getSelectedRechargePlan();
}
function getSelectedRechargePlan() {
    var _a;
    return (_a = getRechargePlans().find((plan) => plan.planId === selectedRechargePlanId)) !== null && _a !== void 0 ? _a : null;
}
async function startRecharge(planId, request = api_client_1.customerApiRequest, options = {}) {
    var _a, _b, _c, _d;
    const response = await request('/api/v1/customer/recharge-transactions', {
        method: 'POST',
        auth: 'customer',
        body: {
            planId,
            idempotencyKey: (_a = options.idempotencyKey) !== null && _a !== void 0 ? _a : createRechargeIdempotencyKey()
        }
    });
    if (!((_b = response.transaction) === null || _b === void 0 ? void 0 : _b.id)) {
        throw new Error(String((_c = response.code) !== null && _c !== void 0 ? _c : 'create_recharge_transaction_failed'));
    }
    const paymentStatus = (_d = response.paymentStatus) !== null && _d !== void 0 ? _d : response.transaction.status;
    if (paymentStatus === 'paid') {
        return response;
    }
    if (!response.paymentParams) {
        if (paymentStatus === 'pending_wechat') {
            throw new Error('missing_wechat_payment_params');
        }
        return syncRechargeTransaction(response.transaction.id, request);
    }
    if (paymentStatus && paymentStatus !== 'pending_wechat' && paymentStatus !== 'processing' && paymentStatus !== 'pending') {
        throw new Error('missing_wechat_payment_params');
    }
    await requestRechargePayment(response.paymentParams);
    return syncRechargeTransaction(response.transaction.id, request);
}
async function syncRechargeTransaction(transactionId, request = api_client_1.customerApiRequest) {
    return request(`/api/v1/customer/recharge-transactions/${transactionId}/payment-sync`, {
        method: 'POST',
        auth: 'customer'
    });
}
