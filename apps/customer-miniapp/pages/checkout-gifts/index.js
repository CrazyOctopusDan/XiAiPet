"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gifts_1 = require("../../src/services/gifts");
Page({
    data: {
        gifts: [],
        selectedCount: 0,
        loading: false
    },
    onShow() {
        void this.refreshGifts();
    },
    async refreshGifts() {
        this.setData({ loading: true });
        try {
            await (0, gifts_1.hydrateCheckoutGifts)();
        }
        catch (_a) {
            wx.showToast({
                title: '赠品加载失败',
                icon: 'none'
            });
        }
        this.syncGiftData();
        this.setData({ loading: false });
    },
    syncGiftData() {
        this.setData({
            gifts: (0, gifts_1.getCheckoutGiftOptions)(),
            selectedCount: (0, gifts_1.getSelectedCheckoutGiftIds)().length
        });
    },
    handleGiftTap(event) {
        var _a, _b;
        const giftId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.giftId;
        if (!giftId) {
            return;
        }
        (0, gifts_1.toggleCheckoutGiftSelection)(giftId);
        this.syncGiftData();
    },
    handleConfirm() {
        wx.navigateBack();
    }
});
