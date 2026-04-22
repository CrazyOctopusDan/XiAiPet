"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../src/services/auth");
Page({
    data: {
        loading: false,
        envLabel: 'dev',
        statusText: '等待授权'
    },
    async onLoad() {
        await this.syncIdentity();
    },
    async handleBootstrapTap() {
        await this.syncIdentity();
    },
    async syncIdentity() {
        this.setData({ loading: true, statusText: '正在同步微信身份' });
        try {
            const result = await (0, auth_1.startCustomerBootstrap)();
            this.setData({
                loading: false,
                statusText: result.ok ? '已连接微信身份' : '身份同步失败'
            });
            if (result.ok) {
                wx.switchTab({
                    url: '/pages/home/index'
                });
            }
        }
        catch (error) {
            console.error('customer bootstrap failed', error);
            this.setData({
                loading: false,
                statusText: `身份同步失败：${error instanceof Error ? error.message : '请下拉重试'}`
            });
        }
    }
});
