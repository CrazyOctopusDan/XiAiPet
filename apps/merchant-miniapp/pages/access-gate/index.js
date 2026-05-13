"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = require("../../src/services/api-client");
function getAccessErrorMessage(error) {
    var _a, _b;
    if (error instanceof Error && error.message) {
        return error.message;
    }
    if (error && typeof error === 'object') {
        const candidate = error;
        const errMsg = (_b = (_a = candidate.errMsg) !== null && _a !== void 0 ? _a : candidate.errorMessage) !== null && _b !== void 0 ? _b : candidate.message;
        if (typeof errMsg === 'string' && errMsg) {
            return errMsg;
        }
    }
    return '请下拉重试';
}
Page({
    data: {
        username: '',
        password: '',
        statusText: '首次登录后需要修改密码',
        accessResult: 'unknown',
        submitting: false
    },
    handleUsernameInput(event) {
        var _a, _b;
        this.setData({ username: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    handlePasswordInput(event) {
        var _a, _b;
        this.setData({ password: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    async handleLoginTap() {
        var _a, _b, _c, _d, _e, _f;
        const username = (_c = (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.username) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : '';
        const password = (_e = (_d = this.data) === null || _d === void 0 ? void 0 : _d.password) !== null && _e !== void 0 ? _e : '';
        if (!username || !password) {
            this.setData({
                accessResult: 'denied',
                statusText: '请输入账号和密码'
            });
            return;
        }
        this.setData({ statusText: '正在登录', submitting: true });
        try {
            const session = await (0, api_client_1.merchantLogin)({ username, password });
            const mustChangePassword = Boolean((_f = session.account) === null || _f === void 0 ? void 0 : _f.mustChangePassword);
            this.setData({
                accessResult: 'allowed',
                statusText: mustChangePassword ? '首次登录需要修改密码' : '登录成功',
                submitting: false
            });
            wx.redirectTo({
                url: mustChangePassword ? '/pages/password-change/index' : '/pages/workspace/index'
            });
        }
        catch (error) {
            console.error('merchant login failed', error);
            const message = error instanceof api_client_1.MerchantApiError && error.message
                ? error.message
                : getAccessErrorMessage(error);
            this.setData({
                accessResult: 'denied',
                statusText: `登录失败：${message}`,
                submitting: false
            });
        }
    }
});
