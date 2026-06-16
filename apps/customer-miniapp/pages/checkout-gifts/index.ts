declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  getCheckoutGiftOptions,
  getSelectedCheckoutGiftIds,
  hydrateCheckoutGifts,
  toggleCheckoutGiftSelection,
  type CheckoutGiftOption
} from '../../src/services/gifts';

interface CheckoutGiftsPageData {
  gifts: CheckoutGiftOption[];
  selectedCount: number;
  loading: boolean;
}

interface CheckoutGiftsPageInstance {
  data: CheckoutGiftsPageData;
  setData(data: Record<string, unknown>): void;
  refreshGifts(): Promise<void>;
  syncGiftData(): void;
}

Page({
  data: {
    gifts: [],
    selectedCount: 0,
    loading: false
  },
  onShow(this: CheckoutGiftsPageInstance) {
    void this.refreshGifts();
  },
  async refreshGifts(this: CheckoutGiftsPageInstance) {
    this.setData({ loading: true });
    try {
      await hydrateCheckoutGifts();
    } catch {
      wx.showToast({
        title: '赠品加载失败',
        icon: 'none'
      });
    }

    this.syncGiftData();
    this.setData({ loading: false });
  },
  syncGiftData(this: CheckoutGiftsPageInstance) {
    this.setData({
      gifts: getCheckoutGiftOptions(),
      selectedCount: getSelectedCheckoutGiftIds().length
    });
  },
  handleGiftTap(this: CheckoutGiftsPageInstance, event: { currentTarget?: { dataset?: { giftId?: string } } }) {
    const giftId = event.currentTarget?.dataset?.giftId;

    if (!giftId) {
      return;
    }

    toggleCheckoutGiftSelection(giftId);
    this.syncGiftData();
  },
  handleConfirm() {
    wx.navigateBack();
  }
});
