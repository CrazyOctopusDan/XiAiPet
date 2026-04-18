"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_1 = require("../../src/services/orders");
const ADJUSTMENT_METHODS = [
    {
        value: 'manual_override',
        label: '人工兜底'
    },
    {
        value: 'offline_collection',
        label: '线下收款'
    }
];
function getDefaultStatusValue(detail) {
    var _a, _b;
    return (_b = (_a = detail === null || detail === void 0 ? void 0 : detail.statusOptions[0]) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
}
function findStatusOption(detail, value) {
    var _a;
    return (_a = detail === null || detail === void 0 ? void 0 : detail.statusOptions.find((item) => item.value === value)) !== null && _a !== void 0 ? _a : null;
}
Page({
    data: {
        orderId: '',
        loading: true,
        isEmpty: true,
        detail: null,
        isDrawerOpen: false,
        selectedStatusValue: '',
        adjustmentMethod: 'manual_override',
        adjustmentMethods: ADJUSTMENT_METHODS,
        reasonNote: '',
        submitting: false
    },
    currentOrder: null,
    onLoad(options) {
        var _a;
        this.setData({
            orderId: (_a = options === null || options === void 0 ? void 0 : options.orderId) !== null && _a !== void 0 ? _a : ''
        });
    },
    async onShow() {
        await this.refreshDetail();
    },
    async refreshDetail() {
        if (!this.data.orderId) {
            this.currentOrder = null;
            this.setData({
                loading: false,
                isEmpty: true,
                detail: null
            });
            return;
        }
        this.setData({ loading: true });
        const response = (await (0, orders_1.getMerchantOrderDetail)(this.data.orderId));
        const detail = (0, orders_1.getMerchantOrderDetailViewModel)(response);
        this.currentOrder = response.order;
        this.setData({
            loading: false,
            isEmpty: !detail,
            detail,
            selectedStatusValue: getDefaultStatusValue(detail),
            reasonNote: ''
        });
    },
    handleBackTap() {
        wx.navigateBack();
    },
    handleOpenStatusDrawer() {
        var _a;
        if (!((_a = this.data.detail) === null || _a === void 0 ? void 0 : _a.canUpdateStatus)) {
            return;
        }
        this.setData({
            isDrawerOpen: true,
            selectedStatusValue: this.data.selectedStatusValue || getDefaultStatusValue(this.data.detail)
        });
    },
    handleCloseStatusDrawer() {
        this.setData({
            isDrawerOpen: false
        });
    },
    handleStatusOptionTap(event) {
        var _a, _b;
        const value = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.value;
        if (!value) {
            return;
        }
        this.setData({
            selectedStatusValue: value
        });
    },
    handleAdjustmentMethodTap(event) {
        var _a, _b;
        const value = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.value;
        if (!value) {
            return;
        }
        this.setData({
            adjustmentMethod: value
        });
    },
    handleReasonInput(event) {
        var _a, _b;
        this.setData({
            reasonNote: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
    },
    async handleSubmitStatus() {
        if (!this.currentOrder || !this.data.detail) {
            return;
        }
        const selected = findStatusOption(this.data.detail, this.data.selectedStatusValue);
        if (!selected) {
            wx.showToast({
                title: '请选择下一状态',
                icon: 'none'
            });
            return;
        }
        if (this.data.detail.requiresManualSettlement && !this.data.reasonNote.trim()) {
            wx.showToast({
                title: '请填写原因备注',
                icon: 'none'
            });
            return;
        }
        this.setData({ submitting: true });
        try {
            await (0, orders_1.updateMerchantOrderStatus)({
                order: this.currentOrder,
                nextStatus: selected.value,
                adjustmentMethod: this.data.detail.requiresManualSettlement ? this.data.adjustmentMethod : undefined,
                reasonNote: this.data.detail.requiresManualSettlement ? this.data.reasonNote.trim() : undefined
            });
            wx.showToast({
                title: '更新成功',
                icon: 'success'
            });
            this.setData({
                isDrawerOpen: false,
                submitting: false,
                reasonNote: ''
            });
            await this.refreshDetail();
        }
        catch (error) {
            this.setData({ submitting: false });
            wx.showToast({
                title: '更新失败，请重试',
                icon: 'none'
            });
        }
    }
});
