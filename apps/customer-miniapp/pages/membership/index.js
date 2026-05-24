"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_config_1 = require("../../src/services/runtime-config");
function getMembershipTiersView() {
    return (0, runtime_config_1.buildMembershipTierCards)((0, runtime_config_1.getCachedCustomerRuntimeConfig)().membershipTiers.tiers);
}
Page({
    data: {
        tiers: getMembershipTiersView(),
        currentIndex: 0,
        loading: false
    },
    onShow() {
        void this.refreshMembership();
    },
    async refreshMembership() {
        this.setData({ loading: true });
        try {
            await (0, runtime_config_1.hydrateCustomerRuntimeConfig)();
        }
        catch (_a) {
            // Keep the membership section empty if the runtime config API is unavailable.
        }
        this.setData({
            tiers: getMembershipTiersView(),
            loading: false
        });
    },
    handleTierChange(event) {
        var _a, _b;
        this.setData({
            currentIndex: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.current) !== null && _b !== void 0 ? _b : 0
        });
    },
    handleBackTap() {
        wx.navigateBack();
    }
});
