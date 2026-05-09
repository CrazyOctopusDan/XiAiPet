"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_1 = require("../../src/services/orders");
const tab_navigation_1 = require("../../src/services/tab-navigation");
function pxToRpx(value, windowWidth) {
    return Math.ceil((value * 750) / windowWidth);
}
function resolveOrdersHeaderMetrics() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const fallback = {
        top: 96,
        height: 64,
        rightPadding: 212
    };
    const windowInfo = (_b = (_a = wx.getWindowInfo) === null || _a === void 0 ? void 0 : _a.call(wx)) !== null && _b !== void 0 ? _b : (_c = wx.getSystemInfoSync) === null || _c === void 0 ? void 0 : _c.call(wx);
    const menuButton = (_d = wx.getMenuButtonBoundingClientRect) === null || _d === void 0 ? void 0 : _d.call(wx);
    const windowWidth = Number((_e = windowInfo === null || windowInfo === void 0 ? void 0 : windowInfo.windowWidth) !== null && _e !== void 0 ? _e : 0);
    const menuTop = Number((_f = menuButton === null || menuButton === void 0 ? void 0 : menuButton.top) !== null && _f !== void 0 ? _f : 0);
    const menuHeight = Number((_g = menuButton === null || menuButton === void 0 ? void 0 : menuButton.height) !== null && _g !== void 0 ? _g : 0);
    const menuLeft = Number((_h = menuButton === null || menuButton === void 0 ? void 0 : menuButton.left) !== null && _h !== void 0 ? _h : 0);
    if (!windowWidth || !menuTop || !menuHeight || !menuLeft) {
        return fallback;
    }
    return {
        top: pxToRpx(menuTop, windowWidth),
        height: pxToRpx(menuHeight, windowWidth),
        rightPadding: pxToRpx(windowWidth - menuLeft + 12, windowWidth)
    };
}
Page({
    data: {
        isEmpty: true,
        emptyStateTitle: '还没有订单',
        emptyStateBody: '支付完成后的订单会出现在这里，先去挑些毛孩子的蛋糕吧。',
        highlightedOrderId: null,
        ordersHeaderTop: 96,
        ordersHeaderHeight: 64,
        ordersHeaderRightPadding: 212,
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
        this.refreshLayoutMetrics();
        this.setData({
            highlightedOrderId: (0, tab_navigation_1.consumePendingOrdersHighlight)()
        });
        await this.refreshOrders();
    },
    refreshLayoutMetrics() {
        const headerMetrics = resolveOrdersHeaderMetrics();
        this.setData({
            ordersHeaderTop: headerMetrics.top,
            ordersHeaderHeight: headerMetrics.height,
            ordersHeaderRightPadding: headerMetrics.rightPadding
        });
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
