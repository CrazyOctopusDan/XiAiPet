"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_admin_1 = require("../../src/services/user-admin");
Page({
    data: {
        user: null,
        detail: null,
        drawerOpen: false,
        action: 'add',
        amountText: '',
        reasonType: '充值',
        note: '',
        resultingBalanceLabel: '￥0.00',
        disableSubmitReason: '请输入调整金额',
        submitting: false
    },
    onLoad() {
        this.refreshDetail();
    },
    refreshDetail() {
        const user = wx.getStorageSync('merchant-selected-user');
        if (!user) {
            this.setData({
                user: null,
                detail: null
            });
            return;
        }
        const latest = (0, user_admin_1.getCachedLatestAdjustment)(user.openid);
        this.setData({
            user,
            detail: (0, user_admin_1.getUserDetailViewModel)(user, latest)
        });
        this.updateDraftPreview();
    },
    updateDraftPreview() {
        if (!this.data.user) {
            return;
        }
        const draft = (0, user_admin_1.buildBalanceAdjustmentDraft)(this.data.user, {
            action: this.data.action,
            amountText: this.data.amountText,
            reasonType: this.data.reasonType,
            note: this.data.note
        });
        this.setData({
            resultingBalanceLabel: draft.resultingBalanceLabel,
            disableSubmitReason: draft.disableSubmitReason
        });
    },
    handleOpenDrawer() {
        this.setData({
            drawerOpen: true
        });
    },
    handleCloseDrawer() {
        this.setData({
            drawerOpen: false
        });
    },
    handleActionTap(event) {
        var _a, _b, _c;
        this.setData({
            action: (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.action) !== null && _c !== void 0 ? _c : 'add'
        });
        this.updateDraftPreview();
    },
    handleAmountInput(event) {
        var _a, _b;
        this.setData({
            amountText: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
        this.updateDraftPreview();
    },
    handleReasonTap(event) {
        var _a, _b, _c;
        this.setData({
            reasonType: (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.reason) !== null && _c !== void 0 ? _c : '充值'
        });
        this.updateDraftPreview();
    },
    handleNoteInput(event) {
        var _a, _b;
        this.setData({
            note: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
        this.updateDraftPreview();
    },
    async handleConfirmAdjust() {
        if (!this.data.user) {
            return;
        }
        const draft = (0, user_admin_1.buildBalanceAdjustmentDraft)(this.data.user, {
            action: this.data.action,
            amountText: this.data.amountText,
            reasonType: this.data.reasonType,
            note: this.data.note
        });
        if (draft.disableSubmitReason) {
            wx.showToast({
                title: draft.disableSubmitReason,
                icon: 'none'
            });
            return;
        }
        const risky = this.data.action === 'deduct' || this.data.action === 'set';
        wx.showModal({
            title: '确认余额调整',
            content: risky
                ? '请确认本次余额调整，提交后将生成流水记录。'
                : '请确认本次余额调整，提交后将生成流水记录。',
            success: async (result) => {
                if (!result.confirm) {
                    return;
                }
                this.setData({ submitting: true });
                await (0, user_admin_1.submitBalanceAdjustment)(draft);
                const updatedUser = {
                    ...this.data.user,
                    currentBalance: draft.afterBalance
                };
                wx.setStorageSync('merchant-selected-user', updatedUser);
                this.setData({
                    submitting: false,
                    drawerOpen: false,
                    user: updatedUser,
                    amountText: '',
                    note: ''
                });
                this.refreshDetail();
                wx.showToast({
                    title: '确认余额调整',
                    icon: 'success'
                });
            }
        });
    }
});
