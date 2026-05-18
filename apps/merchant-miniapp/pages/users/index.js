"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_admin_1 = require("../../src/services/user-admin");
Page({
    data: {
        loading: false,
        isEmpty: true,
        draftQuery: '',
        searchField: 'phone',
        cards: [],
        summary: {
            totalUsers: 0,
            totalBalanceLabel: '￥0.00',
            tierCount: 0
        }
    },
    lastUsers: [],
    onLoad() {
        void this.refreshUsers();
    },
    handleQueryInput(event) {
        var _a, _b;
        this.setData({
            draftQuery: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
    },
    handleSearchFieldTap(event) {
        var _a, _b, _c;
        const field = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.field) !== null && _c !== void 0 ? _c : 'phone';
        this.setData({
            searchField: field
        });
    },
    async handleSearchSubmit() {
        await this.refreshUsers();
    },
    async refreshUsers() {
        this.setData({ loading: true });
        const users = await (0, user_admin_1.queryMerchantUsers)({
            query: this.data.draftQuery.trim(),
            searchField: this.data.searchField
        });
        this.lastUsers = users;
        const view = (0, user_admin_1.getUsersPageViewModel)(users);
        this.setData({
            loading: false,
            isEmpty: view.isEmpty,
            cards: view.cards,
            summary: view.summary
        });
    },
    handleClearSearch() {
        this.lastUsers = [];
        this.setData({
            draftQuery: '',
            isEmpty: true,
            cards: [],
            summary: {
                totalUsers: 0,
                totalBalanceLabel: '￥0.00',
                tierCount: 0
            }
        });
        void this.refreshUsers();
    },
    handleOpenUser(event) {
        var _a, _b;
        const openid = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.openid;
        const user = this.lastUsers.find((item) => item.openid === openid);
        if (!user) {
            return;
        }
        wx.setStorageSync('merchant-selected-user', user);
        wx.navigateTo({
            url: `/pages/user-detail/index?openid=${user.openid}`
        });
    }
});
