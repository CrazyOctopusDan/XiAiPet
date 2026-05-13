"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const merchant_accounts_1 = require("../../src/services/merchant-accounts");
Page({
    data: {
        accounts: [],
        username: '',
        loading: false,
        statusText: '员工初始密码统一为 staff'
    },
    async onShow() {
        await this.refreshAccounts();
    },
    handleUsernameInput(event) {
        var _a, _b;
        this.setData({ username: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    async refreshAccounts() {
        this.setData({ loading: true });
        try {
            const accounts = await (0, merchant_accounts_1.listMerchantAccounts)();
            this.setData({
                accounts,
                loading: false,
                statusText: '员工初始密码统一为 staff'
            });
        }
        catch (error) {
            this.setData({
                loading: false,
                statusText: error instanceof Error && error.message ? error.message : '账号列表加载失败'
            });
        }
    },
    async handleCreateStaff() {
        const username = this.data.username.trim();
        if (!username) {
            wx.showToast({ title: '请输入员工账号', icon: 'none' });
            return;
        }
        this.setData({ loading: true });
        try {
            await (0, merchant_accounts_1.createStaffAccount)(username);
            this.setData({
                username: '',
                statusText: `已创建 ${username}，初始密码 staff`
            });
            await this.refreshAccounts();
        }
        catch (error) {
            this.setData({
                loading: false,
                statusText: error instanceof Error && error.message ? error.message : '创建失败'
            });
        }
    },
    async handleDisableStaff(event) {
        var _a, _b;
        const accountId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id;
        if (!accountId) {
            return;
        }
        await (0, merchant_accounts_1.disableStaffAccount)(accountId);
        await this.refreshAccounts();
    },
    async handleResetPassword(event) {
        var _a, _b;
        const accountId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id;
        if (!accountId) {
            return;
        }
        await (0, merchant_accounts_1.resetStaffPassword)(accountId);
        this.setData({ statusText: '密码已重置为 staff' });
        await this.refreshAccounts();
    }
});
