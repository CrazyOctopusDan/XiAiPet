"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_1 = require("../../src/services/orders");
Page({
    data: {
        orderId: '',
        detail: null,
        isEmpty: true,
        isCompleting: false
    },
    onLoad(options) {
        var _a;
        this.setData({
            orderId: (_a = options === null || options === void 0 ? void 0 : options.orderId) !== null && _a !== void 0 ? _a : ''
        });
    },
    async onShow() {
        await this.refreshDetail();
    },
    async onPullDownRefresh() {
        var _a;
        try {
            await this.refreshDetail();
        }
        finally {
            (_a = wx.stopPullDownRefresh) === null || _a === void 0 ? void 0 : _a.call(wx);
        }
    },
    async refreshDetail() {
        const order = this.data.orderId ? await (0, orders_1.getMyOrderDetail)(this.data.orderId) : null;
        const detail = (0, orders_1.getOrderDetailViewModel)(order);
        this.setData({
            detail,
            isEmpty: !detail
        });
    },
    handleBackTap() {
        wx.switchTab({
            url: '/pages/orders/index'
        });
    },
    handleOpenOrders() {
        wx.switchTab({
            url: '/pages/orders/index'
        });
    },
    async handleCompleteOrderTap() {
        var _a;
        const detail = this.data.detail;
        if (!(detail === null || detail === void 0 ? void 0 : detail.canComplete) || this.data.isCompleting) {
            return;
        }
        const result = await wx.showModal({
            title: detail.completionConfirmTitle,
            content: detail.completionConfirmBody,
            confirmText: detail.completionActionLabel,
            confirmColor: '#2F6478',
            cancelText: '再等等'
        });
        if (!result.confirm) {
            return;
        }
        this.setData({ isCompleting: true });
        try {
            const order = await (0, orders_1.completeMyOrder)(detail.id);
            this.setData({
                detail: (0, orders_1.getOrderDetailViewModel)(order),
                isEmpty: !order
            });
            (_a = wx.showToast) === null || _a === void 0 ? void 0 : _a.call(wx, {
                title: '订单已完成',
                icon: 'success'
            });
        }
        finally {
            this.setData({ isCompleting: false });
        }
    }
});
