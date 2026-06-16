"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recharge_config_1 = require("../../src/services/recharge-config");
function normalizeMoneyInputText(value) {
    const sanitized = (value !== null && value !== void 0 ? value : '').replace(/[^\d.]/g, '');
    const [integerPart = '', ...decimalParts] = sanitized.split('.');
    if (!sanitized.includes('.')) {
        return integerPart;
    }
    return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}
function parseMoneyInput(value) {
    const numeric = Number(normalizeMoneyInputText(value));
    if (!Number.isFinite(numeric) || numeric < 0) {
        return 0;
    }
    return Math.floor(numeric * 100) / 100;
}
function parseDaysInput(value) {
    const numeric = Number((value !== null && value !== void 0 ? value : '').replace(/[^\d]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
    }
    return Math.trunc(numeric);
}
function patchPlan(plans, planId, updater) {
    return plans.map((plan) => (plan.planId === planId ? updater(plan) : plan));
}
Page({
    data: {
        loading: true,
        saving: false,
        plans: [],
        expandedPlanId: '',
        view: (0, recharge_config_1.getRechargeConfigViewModel)([])
    },
    async onShow() {
        await this.refreshPlans();
    },
    refreshView(plans, expandedPlanId) {
        this.setData({
            plans,
            expandedPlanId: expandedPlanId !== null && expandedPlanId !== void 0 ? expandedPlanId : this.data.expandedPlanId,
            view: (0, recharge_config_1.getRechargeConfigViewModel)(plans)
        });
    },
    async refreshPlans() {
        var _a, _b;
        this.setData({ loading: true });
        try {
            const plans = await (0, recharge_config_1.queryRechargePlans)();
            this.setData({ loading: false });
            this.refreshView(plans, (_b = (_a = plans[0]) === null || _a === void 0 ? void 0 : _a.planId) !== null && _b !== void 0 ? _b : '');
        }
        catch (_c) {
            this.setData({ loading: false });
            wx.showToast({
                title: '充值配置加载失败',
                icon: 'none'
            });
        }
    },
    handleTogglePlanExpanded(event) {
        var _a, _b, _c;
        const planId = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.planId) !== null && _c !== void 0 ? _c : '';
        this.setData({
            expandedPlanId: this.data.expandedPlanId === planId ? '' : planId
        });
    },
    handleAddPlan() {
        const draft = (0, recharge_config_1.buildRechargePlanDraft)();
        this.refreshView([...this.data.plans, draft], draft.planId);
    },
    handleDeletePlan(event) {
        var _a, _b;
        const planId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.planId;
        if (!planId) {
            return;
        }
        wx.showModal({
            title: '删除充值档位',
            content: '删除后需保存才会同步到用户端。',
            success: (result) => {
                var _a, _b;
                if (!result.confirm) {
                    return;
                }
                const plans = this.data.plans.filter((plan) => plan.planId !== planId);
                this.refreshView(plans, (_b = (_a = plans[0]) === null || _a === void 0 ? void 0 : _a.planId) !== null && _b !== void 0 ? _b : '');
            }
        });
    },
    handlePlanInput(event) {
        var _a, _b, _c, _d, _e;
        const planId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.planId;
        const field = (_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.dataset) === null || _d === void 0 ? void 0 : _d.field;
        if (!planId || !field) {
            return;
        }
        const rawValue = (_e = event.detail) === null || _e === void 0 ? void 0 : _e.value;
        const plans = patchPlan(this.data.plans, planId, (plan) => {
            if (field === 'enabled') {
                return { ...plan, enabled: Boolean(rawValue) };
            }
            if (field === 'paidAmount' || field === 'bonusAmount') {
                return { ...plan, [field]: parseMoneyInput(typeof rawValue === 'string' ? rawValue : '') };
            }
            if (field === 'description') {
                return { ...plan, description: typeof rawValue === 'string' ? rawValue : '' };
            }
            return plan;
        });
        this.refreshView(plans);
        if (field === 'paidAmount' || field === 'bonusAmount') {
            return normalizeMoneyInputText(typeof rawValue === 'string' ? rawValue : '');
        }
        return undefined;
    },
    handleAddGift(event) {
        var _a, _b;
        const planId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.planId;
        if (!planId) {
            return;
        }
        const plans = patchPlan(this.data.plans, planId, (plan) => ({
            ...plan,
            gifts: [...plan.gifts, (0, recharge_config_1.buildRechargeGiftDraft)()]
        }));
        this.refreshView(plans, planId);
    },
    handleDeleteGift(event) {
        var _a, _b, _c, _d;
        const planId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.planId;
        const giftId = (_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.dataset) === null || _d === void 0 ? void 0 : _d.giftId;
        if (!planId || !giftId) {
            return;
        }
        const plans = patchPlan(this.data.plans, planId, (plan) => ({
            ...plan,
            gifts: plan.gifts.filter((gift) => gift.giftTemplateId !== giftId)
        }));
        this.refreshView(plans, planId);
    },
    handleGiftInput(event) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const planId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.planId;
        const giftId = (_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.dataset) === null || _d === void 0 ? void 0 : _d.giftId;
        const field = (_f = (_e = event.currentTarget) === null || _e === void 0 ? void 0 : _e.dataset) === null || _f === void 0 ? void 0 : _f.field;
        if (!planId || !giftId || !field) {
            return;
        }
        const rawValue = (_h = (_g = event.detail) === null || _g === void 0 ? void 0 : _g.value) !== null && _h !== void 0 ? _h : '';
        const plans = patchPlan(this.data.plans, planId, (plan) => ({
            ...plan,
            gifts: plan.gifts.map((gift) => {
                if (gift.giftTemplateId !== giftId) {
                    return gift;
                }
                if (field === 'validDays') {
                    return { ...gift, validDays: parseDaysInput(rawValue) };
                }
                return { ...gift, [field]: rawValue };
            })
        }));
        this.refreshView(plans, planId);
        if (field === 'validDays') {
            return String(parseDaysInput(rawValue) || '');
        }
        return undefined;
    },
    async handleSave() {
        var _a, _b;
        let normalized;
        try {
            normalized = (0, recharge_config_1.normalizeRechargePlansDraft)({ plans: this.data.plans });
        }
        catch (_c) {
            wx.showToast({
                title: '请补全金额和赠品名称',
                icon: 'none'
            });
            return;
        }
        this.setData({ saving: true });
        try {
            const plans = await (0, recharge_config_1.saveRechargePlans)(normalized);
            this.setData({ saving: false });
            this.refreshView(plans, (_b = (_a = plans[0]) === null || _a === void 0 ? void 0 : _a.planId) !== null && _b !== void 0 ? _b : '');
            wx.showToast({
                title: '保存成功',
                icon: 'success'
            });
        }
        catch (_d) {
            this.setData({ saving: false });
            wx.showToast({
                title: '保存失败',
                icon: 'none'
            });
        }
    }
});
