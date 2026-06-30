"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = require("../../src/services/api-client");
const notifications_1 = require("../../src/services/notifications");
const workspace_1 = require("../../src/services/workspace");
Page({
    data: {
        cards: (0, workspace_1.getMerchantWorkspaceCards)(),
        accountName: '商户账号',
        notificationSubmitting: false
    },
    onShow() {
        var _a, _b;
        const account = (_a = (0, api_client_1.getMerchantSession)()) === null || _a === void 0 ? void 0 : _a.account;
        const role = (_b = account === null || account === void 0 ? void 0 : account.role) !== null && _b !== void 0 ? _b : 'admin';
        this.setData({
            cards: (0, workspace_1.getMerchantWorkspaceCards)(role),
            accountName: (account === null || account === void 0 ? void 0 : account.username) ? `${account.username}` : '商户账号'
        });
    },
    handleActionTap(event) {
        var _a, _b;
        const url = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.url;
        if (!url) {
            return;
        }
        wx.navigateTo({
            url
        });
    },
    async handleEnableNotificationTap() {
        if (this.data.notificationSubmitting) {
            return;
        }
        this.setData({ notificationSubmitting: true });
        try {
            const result = await (0, notifications_1.enableNewOrderSubscription)();
            wx.showToast({
                title: result.ok ? '新订单提醒已开启' : '未开启新订单提醒',
                icon: 'none'
            });
        }
        catch (error) {
            console.error('enable merchant notification failed', error);
            wx.showToast({
                title: '开启提醒失败',
                icon: 'none'
            });
        }
        finally {
            this.setData({ notificationSubmitting: false });
        }
    },
    handleLogoutTap() {
        (0, api_client_1.merchantLogout)();
        wx.reLaunch({
            url: '/pages/access-gate/index'
        });
    }
});
