"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gifts_1 = require("../../src/services/gifts");
const GROUP_LABELS = {
    available: '可用赠品',
    locked: '已锁定',
    redeemed: '已兑换',
    expired: '已过期'
};
function buildGiftSections() {
    const groups = (0, gifts_1.getMyGiftGroups)();
    return ['available', 'locked', 'redeemed', 'expired'].map((key) => ({
        key,
        label: GROUP_LABELS[key],
        items: groups[key],
        disabled: key === 'expired'
    }));
}
Page({
    data: {
        sections: buildGiftSections(),
        loading: false
    },
    onShow() {
        void this.refreshGifts();
    },
    async refreshGifts() {
        this.setData({ loading: true });
        try {
            await (0, gifts_1.hydrateMyGifts)();
        }
        catch (_a) {
            wx.showToast({
                title: '赠品加载失败',
                icon: 'none'
            });
        }
        this.setData({
            sections: buildGiftSections(),
            loading: false
        });
    }
});
