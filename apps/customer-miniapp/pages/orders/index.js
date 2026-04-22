"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_1 = require("../../src/services/orders");
const tab_navigation_1 = require("../../src/services/tab-navigation");
Page({
    data: {
        isEmpty: true,
        emptyStateTitle: '还没有订单',
        emptyStateBody: '支付完成后的订单会出现在这里，先去挑些毛孩子的蛋糕吧。',
        highlightedOrderId: null,
        orderCards: []
    },
    onLoad(options) {
        var _a;
        this.setData({
            highlightedOrderId: (_a = options === null || options === void 0 ? void 0 : options.highlightOrderId) !== null && _a !== void 0 ? _a : null
        });
    },
    async onShow() {
        var _a, _b, _c;
        (_c = (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setSelectedKey) === null || _c === void 0 ? void 0 : _c.call(_b, 'orders');
        this.setData({
            highlightedOrderId: (0, tab_navigation_1.consumePendingOrdersHighlight)()
        });
        await this.refreshOrders();
    },
    async refreshOrders() {
        const orders = await (0, orders_1.queryMyOrders)();
        const view = (0, orders_1.getOrdersPageViewModel)(orders, this.data.highlightedOrderId);
        this.setData({
            isEmpty: view.isEmpty,
            highlightedOrderId: view.highlightedOrderId,
            orderCards: view.cards
        });
    },
    handleHomeTap() {
        wx.redirectTo({
            url: '/pages/home/index'
        });
    },
    handleOrdersTap() {
        return undefined;
    },
    handleProfileTap() {
        wx.redirectTo({
            url: '/pages/profile/index'
        });
    },
    handleGoCatalog() {
        wx.navigateTo({
            url: '/pages/catalog/index'
        });
    },
    handleOrderTap(event) {
        var _a, _b;
        const orderId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.orderId;
        if (!orderId) {
            return;
        }
        wx.navigateTo({
            url: `/pages/order-detail/index?orderId=${orderId}`
        });
    }
});
