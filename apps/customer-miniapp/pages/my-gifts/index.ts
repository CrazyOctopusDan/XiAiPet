declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { UserGiftDisplayGroup, UserGiftView } from '@xiaipet/shared';

import { getMyGiftGroups, hydrateMyGifts } from '../../src/services/gifts';

interface GiftSection {
  key: UserGiftDisplayGroup;
  label: string;
  items: UserGiftView[];
  disabled: boolean;
}

interface MyGiftsPageData {
  sections: GiftSection[];
  loading: boolean;
}

interface MyGiftsPageInstance {
  data: MyGiftsPageData;
  setData(data: Record<string, unknown>): void;
  refreshGifts(): Promise<void>;
}

const GROUP_LABELS: Record<UserGiftDisplayGroup, string> = {
  available: '可用赠品',
  locked: '已锁定',
  redeemed: '已兑换',
  expired: '已过期'
};

function buildGiftSections(): GiftSection[] {
  const groups = getMyGiftGroups();
  return (['available', 'locked', 'redeemed', 'expired'] as UserGiftDisplayGroup[]).map((key) => ({
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
  onShow(this: MyGiftsPageInstance) {
    void this.refreshGifts();
  },
  async refreshGifts(this: MyGiftsPageInstance) {
    this.setData({ loading: true });
    try {
      await hydrateMyGifts();
    } catch {
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
