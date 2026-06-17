"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gifts_1 = require("../../src/services/gifts");
const GROUP_LABELS = {
    available: '可用赠品',
    locked: '已锁定',
    redeemed: '已兑换',
    expired: '已过期'
};
function padDatePart(value) {
    return value.toString().padStart(2, '0');
}
function formatGiftExpiresAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const datePart = [
        date.getFullYear(),
        padDatePart(date.getMonth() + 1),
        padDatePart(date.getDate())
    ].join('-');
    const timePart = [
        padDatePart(date.getHours()),
        padDatePart(date.getMinutes()),
        padDatePart(date.getSeconds())
    ].join('-');
    return `${datePart} ${timePart}`;
}
function mapGiftDisplayItem(gift) {
    return {
        ...gift,
        displayExpiresAt: formatGiftExpiresAt(gift.expiresAt)
    };
}
function buildGiftSections() {
    const groups = (0, gifts_1.getMyGiftGroups)();
    return ['available', 'locked', 'redeemed', 'expired'].map((key) => ({
        key,
        label: GROUP_LABELS[key],
        items: groups[key].map(mapGiftDisplayItem),
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
