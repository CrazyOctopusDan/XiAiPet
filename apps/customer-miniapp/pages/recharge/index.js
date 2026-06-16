"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recharge_1 = require("../../src/services/recharge");
function createPageRechargeKey() {
    return `recharge-page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function resetRechargeSubmissionState(page) {
    page.rechargeIdempotencyKey = createPageRechargeKey();
    page.rechargeIdempotencyPlanId = '';
    page.rechargeTransactionStarted = false;
}
Page({
    data: {
        plans: [],
        selectedPlanId: '',
        selectedPlan: null,
        loading: false,
        submitting: false
    },
    rechargeIdempotencyKey: '',
    rechargeIdempotencyPlanId: '',
    rechargeTransactionStarted: false,
    onLoad() {
        resetRechargeSubmissionState(this);
    },
    onShow() {
        void this.refreshPlans();
    },
    async refreshPlans() {
        this.setData({ loading: true });
        try {
            await (0, recharge_1.hydrateRechargePlans)();
        }
        catch (_a) {
            wx.showToast({
                title: '充值方案加载失败',
                icon: 'none'
            });
        }
        this.refreshSelection((0, recharge_1.getSelectedRechargePlan)());
        this.setData({ loading: false });
    },
    refreshSelection(plan) {
        var _a, _b;
        const plans = (0, recharge_1.getRechargePlans)();
        const selectedPlan = (_a = plan !== null && plan !== void 0 ? plan : plans[0]) !== null && _a !== void 0 ? _a : null;
        this.setData({
            plans,
            selectedPlanId: (_b = selectedPlan === null || selectedPlan === void 0 ? void 0 : selectedPlan.planId) !== null && _b !== void 0 ? _b : '',
            selectedPlan
        });
    },
    handlePlanTap(event) {
        var _a, _b;
        const planId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.planId;
        if (!planId) {
            return;
        }
        if (planId !== this.data.selectedPlanId && this.rechargeIdempotencyPlanId !== planId) {
            resetRechargeSubmissionState(this);
        }
        this.refreshSelection((0, recharge_1.selectRechargePlan)(planId));
    },
    async handleSubmitRecharge() {
        if (!this.data.selectedPlanId || this.data.submitting) {
            return;
        }
        this.setData({ submitting: true });
        if (this.rechargeIdempotencyPlanId && this.rechargeIdempotencyPlanId !== this.data.selectedPlanId) {
            resetRechargeSubmissionState(this);
        }
        if (!this.rechargeIdempotencyPlanId) {
            this.rechargeIdempotencyPlanId = this.data.selectedPlanId;
        }
        this.rechargeTransactionStarted = true;
        try {
            await (0, recharge_1.startRecharge)(this.data.selectedPlanId, undefined, {
                idempotencyKey: this.rechargeIdempotencyKey
            });
            resetRechargeSubmissionState(this);
            wx.showToast({
                title: '充值成功',
                icon: 'success'
            });
            wx.navigateBack();
        }
        catch (_a) {
            wx.showToast({
                title: '充值未完成',
                icon: 'none'
            });
        }
        finally {
            this.setData({ submitting: false });
        }
    }
});
