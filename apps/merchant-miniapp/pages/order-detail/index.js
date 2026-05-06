"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_1 = require("../../src/services/orders");
const order_receipt_print_1 = require("../../src/services/order-receipt-print");
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
function showModal(options) {
    return new Promise((resolve) => {
        wx.showModal({
            ...options,
            success: (response) => resolve(Boolean(response.confirm)),
            fail: () => resolve(false)
        });
    });
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
        submitting: false,
        printing: false
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
    handleOpenPrinterSettings() {
        wx.navigateTo({
            url: '/pages/printer-settings/index'
        });
    },
    async handlePrintReceipt() {
        var _a;
        if (!this.currentOrder || !((_a = this.data.detail) === null || _a === void 0 ? void 0 : _a.canPrintReceipt) || this.data.printing) {
            return;
        }
        this.setData({ printing: true });
        try {
            await (0, order_receipt_print_1.printOrderReceipt)({
                orderId: this.currentOrder.id
            });
            wx.showToast({
                title: '打印成功',
                icon: 'success'
            });
            await this.refreshDetail();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message === 'NO_PRINTER_CONNECTED') {
                const confirmed = await showModal({
                    title: '未绑定打印机',
                    content: '需要先绑定蓝牙小票机后再打印。',
                    confirmText: '去设置',
                    cancelText: '稍后'
                });
                if (confirmed) {
                    wx.navigateTo({
                        url: '/pages/printer-settings/index'
                    });
                }
            }
            else {
                wx.showToast({
                    title: '打印失败，请重试',
                    icon: 'none'
                });
            }
        }
        finally {
            this.setData({ printing: false });
        }
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
            if (selected.value === 'in_production') {
                const confirmed = await showModal({
                    title: '打印小票',
                    content: '订单已进入制作中，是否现在打印小票？',
                    confirmText: '打印',
                    cancelText: '稍后'
                });
                if (confirmed) {
                    await this.handlePrintReceipt();
                }
            }
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
