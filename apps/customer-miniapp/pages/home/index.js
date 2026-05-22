"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_1 = require("../../src/services/catalog");
const runtime_config_1 = require("../../src/services/runtime-config");
function getHomeModuleAction(moduleId) {
    var _a;
    const actions = {
        preorder: { actionLabel: '点击浏览商品', actionTone: 'pink' },
        notice: { actionLabel: '查看须知', actionTone: 'blue' },
        vip: { actionLabel: '查看权益', actionTone: 'blue' }
    };
    return (_a = actions[moduleId]) !== null && _a !== void 0 ? _a : { actionLabel: '', actionTone: '' };
}
function decorateHomeModules(modules) {
    return modules.map((module) => ({
        ...module,
        ...getHomeModuleAction(module.id)
    }));
}
function buildHomeModulesFallback() {
    return decorateHomeModules((0, catalog_1.getHomeModules)().map((module) => ({
        ...module,
        imageSrc: module.imageFileId
    })));
}
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
        modules: buildHomeModulesFallback(),
        heroBannerSrc: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().banner.fileId,
        storeContact: {
            wechatId: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().store.wechatId,
            ownerPhone: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().store.ownerPhone
        },
        purchaseNotice: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().customNotice.content,
        contactModalVisible: false,
        noticeModalVisible: false
    },
    onShow() {
        var _a, _b, _c;
        (_c = (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setSelectedKey) === null || _c === void 0 ? void 0 : _c.call(_b, 'home');
        void this.refreshHome();
    },
    async refreshHome() {
        const modulePromise = (0, catalog_1.resolveHomeModuleImageSources)();
        try {
            await (0, runtime_config_1.hydrateCustomerRuntimeConfig)();
        }
        finally {
            this.setData({
                modules: decorateHomeModules(await modulePromise),
                heroBannerSrc: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().banner.fileId,
                storeContact: {
                    wechatId: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().store.wechatId,
                    ownerPhone: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().store.ownerPhone
                },
                purchaseNotice: (0, runtime_config_1.getCachedCustomerRuntimeConfig)().customNotice.enabled ? (0, runtime_config_1.getCachedCustomerRuntimeConfig)().customNotice.content : ''
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
        if (moduleId === 'consulting') {
            this.setData({ contactModalVisible: true });
            return;
        }
        if (moduleId === 'notice') {
            this.setData({ noticeModalVisible: true });
            return;
        }
        wx.showToast({
            title: '该模块下一阶段继续实现',
            icon: 'none'
        });
    },
    handleCloseContactModal() {
        this.setData({ contactModalVisible: false });
    },
    handleCloseNoticeModal() {
        this.setData({ noticeModalVisible: false });
    },
    handleCopyContact(event) {
        var _a, _b;
        const value = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.value;
        if (!value) {
            wx.showToast({
                title: '暂无可复制内容',
                icon: 'none'
            });
            return;
        }
        wx.setClipboardData({
            data: value,
            success: () => {
                wx.showToast({
                    title: '已复制',
                    icon: 'success'
                });
            }
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
