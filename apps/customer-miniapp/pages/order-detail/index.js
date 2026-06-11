"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_1 = require("../../src/services/orders");
Page({
    data: {
        orderId: '',
        detail: null,
        isEmpty: true
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
    }
});
