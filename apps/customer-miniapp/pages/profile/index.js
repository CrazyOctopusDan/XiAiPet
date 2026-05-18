"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const profile_1 = require("../../src/services/profile");
function resolveProfileSafeTop() {
    var _a, _b, _c, _d, _e, _f;
    const fallbackRpx = 144;
    const windowInfo = (_b = (_a = wx.getWindowInfo) === null || _a === void 0 ? void 0 : _a.call(wx)) !== null && _b !== void 0 ? _b : (_c = wx.getSystemInfoSync) === null || _c === void 0 ? void 0 : _c.call(wx);
    const menuButton = (_d = wx.getMenuButtonBoundingClientRect) === null || _d === void 0 ? void 0 : _d.call(wx);
    const windowWidth = Number((_e = windowInfo === null || windowInfo === void 0 ? void 0 : windowInfo.windowWidth) !== null && _e !== void 0 ? _e : 0);
    const menuBottom = Number((_f = menuButton === null || menuButton === void 0 ? void 0 : menuButton.bottom) !== null && _f !== void 0 ? _f : 0);
    if (!windowWidth || !menuBottom) {
        return fallbackRpx;
    }
    return Math.ceil(((menuBottom + 16) * 750) / windowWidth);
}
Page({
    data: {
        summary: (0, profile_1.getProfileSummary)(),
        profileSafeTop: 144
    },
    onShow() {
        var _a, _b, _c;
        (_c = (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setSelectedKey) === null || _c === void 0 ? void 0 : _c.call(_b, 'profile');
        this.refreshLayoutMetrics();
        void this.refreshSummary();
    },
    refreshLayoutMetrics() {
        this.setData({
            profileSafeTop: resolveProfileSafeTop()
        });
    },
    async refreshSummary() {
        try {
            await (0, profile_1.hydrateProfile)();
        }
        catch (_a) {
            // Keep the latest local profile snapshot visible if the network is unavailable.
        }
        this.setData({
            summary: (0, profile_1.getProfileSummary)()
        });
    },
    handleHomeTap() {
        wx.redirectTo({
            url: '/pages/home/index'
        });
    },
    handleOrdersTap() {
        wx.redirectTo({
            url: '/pages/orders/index'
        });
    },
    handleProfileTap() {
        return undefined;
    },
    handleProfileDetailTap() {
        wx.navigateTo({
            url: '/pages/profile-detail/index'
        });
    },
    handleAddressTap() {
        wx.navigateTo({
            url: '/pages/address-list/index'
        });
    },
    handlePetsTap() {
        wx.navigateTo({
            url: '/pages/pets/index'
        });
    },
    handleBalanceTap() {
        if (!(0, profile_1.hasBoundPhone)()) {
            wx.navigateTo({
                url: (0, profile_1.getPhoneBindingRedirectUrl)('/pages/balance/index')
            });
            return;
        }
        wx.navigateTo({
            url: '/pages/balance/index'
        });
    },
    handleProfileFactTap(event) {
        var _a, _b;
        const target = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.target;
        if (target === 'birthday' || target === 'contact') {
            wx.navigateTo({
                url: '/pages/profile-detail/index'
            });
        }
    }
});
