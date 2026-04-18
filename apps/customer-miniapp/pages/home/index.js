"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_1 = require("../../src/services/catalog");
const runtime_config_1 = require("../../src/services/runtime-config");
function getNavigationMetrics() {
    var _a, _b, _c, _d, _e, _f;
    const windowInfo = (_d = (_b = (_a = wx.getWindowInfo) === null || _a === void 0 ? void 0 : _a.call(wx)) !== null && _b !== void 0 ? _b : (_c = wx.getSystemInfoSync) === null || _c === void 0 ? void 0 : _c.call(wx)) !== null && _d !== void 0 ? _d : {};
    const menuButton = (_e = wx.getMenuButtonBoundingClientRect) === null || _e === void 0 ? void 0 : _e.call(wx);
    const statusBarHeight = (_f = windowInfo.statusBarHeight) !== null && _f !== void 0 ? _f : 20;
    if (!menuButton) {
        const navBarHeight = 44;
        return {
            statusBarHeight,
            navBarHeight,
            contentTop: statusBarHeight + navBarHeight
        };
    }
    const navBarHeight = Math.max(44, menuButton.bottom + menuButton.top - statusBarHeight);
    return {
        statusBarHeight,
        navBarHeight,
        contentTop: statusBarHeight + navBarHeight
    };
}
Page({
    data: {
        modules: (0, catalog_1.getHomeModules)(),
        heroBannerSrc: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().banner.fileId
    },
    onShow() {
        void this.refreshHome();
    },
    async refreshHome() {
        try {
            await (0, runtime_config_1.hydrateCustomerRuntimeConfig)();
        }
        finally {
            this.setData({
                modules: (0, catalog_1.getHomeModules)(),
                heroBannerSrc: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().banner.fileId
            });
        }
    },
    handleModuleTap(event) {
        var _a, _b;
        const moduleId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.moduleId;
        if (moduleId === 'preorder') {
            wx.navigateTo({
                url: '/pages/catalog/index'
            });
            return;
        }
        wx.showToast({
            title: '该模块下一阶段继续实现',
            icon: 'none'
        });
    },
    handleHomeTap() {
        return undefined;
    },
    handleOrdersTap() {
        wx.redirectTo({
            url: '/pages/orders/index'
        });
    },
    handleProfileTap() {
        wx.redirectTo({
            url: '/pages/profile/index'
        });
    }
});
