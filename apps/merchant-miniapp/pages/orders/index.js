"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_1 = require("../../src/services/orders");
const FILTERS = [
    { value: 'all', label: '全部' },
    { value: 'delivery', label: '配送' },
    { value: 'pickup', label: '自取' },
    { value: 'express', label: '快递' }
];
function matchesMode(group, mode) {
    if (mode === 'all') {
        return true;
    }
    return group.orders.some((item) => {
        if (mode === 'delivery') {
            return item.fulfillmentLabel === '配送到家';
        }
        if (mode === 'pickup') {
            return item.fulfillmentLabel === '到店自取';
        }
        return item.fulfillmentLabel === '快递发货';
    });
}
function filterGroups(groups, keyword, mode) {
    const normalizedKeyword = keyword.trim();
    return groups
        .filter((group) => matchesMode(group, mode))
        .map((group) => ({
        ...group,
        orders: group.orders.filter((order) => {
            var _a;
            if (!normalizedKeyword) {
                return true;
            }
            return [
                order.orderIdLabel,
                order.itemSummary,
                order.customerLabel,
                order.scheduleLabel,
                order.statusLabel,
                (_a = order.secondaryBadgeLabel) !== null && _a !== void 0 ? _a : ''
            ].some((value) => value.includes(normalizedKeyword));
        })
    }))
        .filter((group) => group.orders.length > 0)
        .map((group) => ({
        ...group,
        countLabel: `${group.orders.length} 单`
    }));
}
Page({
    data: {
        loading: true,
        isEmpty: true,
        draftKeyword: '',
        keyword: '',
        scope: 'active',
        pageTitle: '订单管理',
        pageSubtitle: '按履约进度处理未完成订单',
        summaryOrderLabel: '当前订单',
        activeMode: 'all',
        filters: FILTERS,
        groups: [],
        summary: {
            totalOrders: 0,
            activeGroups: 0,
            pendingPayment: 0
        },
        emptyTitle: '还没有订单',
        emptyBody: '新订单会按履约进度分组显示在这里。'
    },
    onLoad(options) {
        const scope = (options === null || options === void 0 ? void 0 : options.scope) === 'history' ? 'history' : 'active';
        this.setData({
            scope,
            pageTitle: scope === 'history' ? '历史订单' : '订单管理',
            pageSubtitle: scope === 'history' ? '查看已完成订单记录' : '按履约进度处理未完成订单',
            summaryOrderLabel: scope === 'history' ? '历史订单' : '当前订单',
            emptyTitle: scope === 'history' ? '暂无历史订单' : '还没有订单',
            emptyBody: scope === 'history' ? '已完成的订单会显示在这里。' : '新订单会按履约进度分组显示在这里。'
        });
    },
    async onShow() {
        await this.refreshOrders();
    },
    async onPullDownRefresh() {
        var _a;
        await this.refreshOrders();
        (_a = wx.stopPullDownRefresh) === null || _a === void 0 ? void 0 : _a.call(wx);
    },
    async refreshOrders() {
        this.setData({ loading: true });
        try {
            const groups = (0, orders_1.getMerchantOrdersPageViewModel)(await (0, orders_1.queryMerchantOrders)({
                scope: this.data.scope,
                fulfillmentMode: this.data.activeMode
            })).groups;
            const filteredGroups = filterGroups(groups, this.data.keyword, this.data.activeMode);
            const hasFilters = Boolean(this.data.keyword.trim()) || this.data.activeMode !== 'all';
            const baseEmptyTitle = this.data.scope === 'history' ? '暂无历史订单' : '还没有订单';
            const baseEmptyBody = this.data.scope === 'history' ? '已完成的订单会显示在这里。' : '新订单会按履约进度分组显示在这里。';
            this.setData({
                loading: false,
                isEmpty: filteredGroups.length === 0,
                groups: filteredGroups,
                summary: (0, orders_1.getMerchantOrderGroupSummary)(filteredGroups),
                emptyTitle: hasFilters ? '没有匹配的订单' : baseEmptyTitle,
                emptyBody: hasFilters ? '换个关键词或履约方式再试一次。' : baseEmptyBody
            });
        }
        catch (_a) {
            this.setData({ loading: false });
            wx.showToast({
                title: '订单加载失败',
                icon: 'none'
            });
        }
    },
    handleKeywordInput(event) {
        var _a, _b;
        this.setData({
            draftKeyword: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
    },
    handleKeywordConfirm() {
        this.setData({
            keyword: this.data.draftKeyword.trim()
        });
        void this.refreshOrders();
    },
    handleClearSearch() {
        this.setData({
            draftKeyword: '',
            keyword: ''
        });
        void this.refreshOrders();
    },
    handleFilterTap(event) {
        var _a, _b, _c;
        const value = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : 'all';
        this.setData({
            activeMode: value
        });
        void this.refreshOrders();
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
