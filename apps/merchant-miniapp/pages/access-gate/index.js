"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const access_1 = require("../../src/services/access");
Page({
    data: {
        statusText: '等待校验',
        accessResult: 'unknown'
    },
    async handleVerifyTap() {
        this.setData({ statusText: '正在校验商户权限' });
        try {
            const result = await (0, access_1.verifyMerchantAccess)();
            const allowed = Boolean(result === null || result === void 0 ? void 0 : result.allowed);
            this.setData({
                accessResult: allowed ? 'allowed' : 'denied',
                statusText: allowed ? '白名单已放行' : '当前账号还没有商户权限'
            });
            if (allowed) {
                wx.redirectTo({
                    url: '/pages/workspace/index'
                });
            }
        }
        catch (error) {
            this.setData({
                accessResult: 'denied',
                statusText: '身份同步失败，请下拉重试'
            });
        }
    }
});
