"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const merchant_accounts_1 = require("../../src/services/merchant-accounts");
Page({
    data: {
        accounts: [],
        accountCards: [],
        summary: {
            total: 0,
            staff: 0,
            needsPasswordChange: 0
        },
        username: '',
        loading: false,
        statusText: '初始密码 staff，首次登录需修改'
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
            const workspace = (0, merchant_accounts_1.formatMerchantAccountWorkspace)(accounts);
            this.setData({
                accounts,
                accountCards: workspace.items,
                summary: workspace.summary,
                loading: false,
                statusText: '初始密码 staff，首次登录需修改'
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
        this.setData({ loading: true, statusText: '正在停用员工账号' });
        try {
            await (0, merchant_accounts_1.disableStaffAccount)(accountId);
            this.setData({ statusText: '员工账号已停用' });
            await this.refreshAccounts();
        }
        catch (error) {
            this.setData({
                loading: false,
                statusText: error instanceof Error && error.message ? error.message : '停用失败'
            });
        }
    },
    async handleResetPassword(event) {
        var _a, _b;
        const accountId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id;
        if (!accountId) {
            return;
        }
        this.setData({ loading: true, statusText: '正在重置密码' });
        try {
            await (0, merchant_accounts_1.resetStaffPassword)(accountId);
            this.setData({ statusText: '密码已重置为 staff' });
            await this.refreshAccounts();
        }
        catch (error) {
            this.setData({
                loading: false,
                statusText: error instanceof Error && error.message ? error.message : '重置失败'
            });
        }
    }
});
