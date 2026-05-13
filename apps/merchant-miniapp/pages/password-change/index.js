"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = require("../../src/services/api-client");
Page({
    data: {
        username: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        statusText: '首次登录必须修改密码',
        submitting: false
    },
    onLoad() {
        var _a, _b;
        const session = (0, api_client_1.getMerchantSession)();
        this.setData({
            username: (_b = (_a = session === null || session === void 0 ? void 0 : session.account) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : ''
        });
    },
    handleCurrentInput(event) {
        var _a, _b;
        this.setData({ currentPassword: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    handleNewInput(event) {
        var _a, _b;
        this.setData({ newPassword: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    handleConfirmInput(event) {
        var _a, _b;
        this.setData({ confirmPassword: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    async handleSubmit() {
        var _a, _b, _c, _d, _e, _f;
        const currentPassword = (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.currentPassword) !== null && _b !== void 0 ? _b : '';
        const newPassword = (_d = (_c = this.data) === null || _c === void 0 ? void 0 : _c.newPassword) !== null && _d !== void 0 ? _d : '';
        const confirmPassword = (_f = (_e = this.data) === null || _e === void 0 ? void 0 : _e.confirmPassword) !== null && _f !== void 0 ? _f : '';
        if (!currentPassword || !newPassword) {
            this.setData({ statusText: '请输入当前密码和新密码' });
            return;
        }
        if (newPassword.length < 4) {
            this.setData({ statusText: '新密码至少 4 位' });
            return;
        }
        if (newPassword !== confirmPassword) {
            this.setData({ statusText: '两次输入的新密码不一致' });
            return;
        }
        this.setData({ submitting: true, statusText: '正在修改密码' });
        try {
            await (0, api_client_1.changeMerchantPassword)({ currentPassword, newPassword });
            this.setData({ submitting: false, statusText: '密码已修改' });
            wx.redirectTo({
                url: '/pages/workspace/index'
            });
        }
        catch (error) {
            const message = error instanceof Error && error.message ? error.message : '请稍后重试';
            this.setData({
                submitting: false,
                statusText: `修改失败：${message}`
            });
        }
    }
});
