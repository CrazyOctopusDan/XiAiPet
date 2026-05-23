"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const balance_1 = require("../../src/services/balance");
const profile_1 = require("../../src/services/profile");
Page({
    data: {
        overview: (0, balance_1.getBalanceOverview)(),
        groups: [],
        loading: false,
        loadingMore: false,
        hasMore: (0, balance_1.getBalancePagination)().hasMore
    },
    onShow() {
        void this.refreshBalance();
    },
    async refreshBalance() {
        this.setData({
            overview: (0, balance_1.getBalanceOverview)(),
            groups: (0, balance_1.getMonthlyBalanceGroups)(),
            hasMore: (0, balance_1.getBalancePagination)().hasMore,
            loading: true
        });
        try {
            await (0, profile_1.hydrateProfile)();
        }
        catch (_a) {
            // Keep the local profile snapshot when the network is unavailable.
        }
        if (!(0, profile_1.hasBoundPhone)()) {
            wx.redirectTo({
                url: (0, profile_1.getPhoneBindingRedirectUrl)('/pages/balance/index')
            });
            this.setData({ loading: false });
            return;
        }
        try {
            await (0, balance_1.hydrateBalance)();
        }
        catch (_b) {
            // Keep the latest local ledger snapshot visible if the network is unavailable.
        }
        this.setData({
            overview: (0, balance_1.getBalanceOverview)(),
            groups: (0, balance_1.getMonthlyBalanceGroups)(),
            hasMore: (0, balance_1.getBalancePagination)().hasMore,
            loading: false
        });
    },
    async loadMoreRecords() {
        if (this.data.loading || this.data.loadingMore || !this.data.hasMore) {
            return;
        }
        this.setData({ loadingMore: true });
        try {
            await (0, balance_1.loadMoreBalance)();
        }
        catch (_a) {
            // Keep the current visible page if loading more fails.
        }
        this.setData({
            overview: (0, balance_1.getBalanceOverview)(),
            groups: (0, balance_1.getMonthlyBalanceGroups)(),
            hasMore: (0, balance_1.getBalancePagination)().hasMore,
            loadingMore: false
        });
    },
    onReachBottom() {
        void this.loadMoreRecords();
    }
});
