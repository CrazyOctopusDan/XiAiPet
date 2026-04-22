"use strict";
const CLOUD_ENV_ID = 'cloud1-d6g77eyym7081a1b0';
App({
    globalData: {
        auth: {
            status: 'idle'
        },
        cartCount: 0
    },
    onLaunch() {
        var _a;
        if ((_a = wx === null || wx === void 0 ? void 0 : wx.cloud) === null || _a === void 0 ? void 0 : _a.init) {
            wx.cloud.init({
                env: CLOUD_ENV_ID,
                traceUser: true
            });
        }
    }
});
