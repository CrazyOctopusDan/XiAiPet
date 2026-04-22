"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const profile_1 = require("../../src/services/profile");
Page({
    data: {
        summary: (0, profile_1.getProfileSummary)()
    },
    onShow() {
        var _a, _b, _c;
        (_c = (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setSelectedKey) === null || _c === void 0 ? void 0 : _c.call(_b, 'profile');
        this.refreshSummary();
    },
    refreshSummary() {
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
        wx.navigateTo({
            url: '/pages/balance/index'
        });
    }
});
