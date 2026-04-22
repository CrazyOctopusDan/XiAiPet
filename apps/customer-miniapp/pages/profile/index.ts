declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getProfileSummary } from '../../src/services/profile';

interface ProfilePageData {
  summary: ReturnType<typeof getProfileSummary>;
}

interface ProfilePageInstance {
  data: ProfilePageData;
  setData(data: Record<string, unknown>): void;
  refreshSummary(): void;
  getTabBar?(): { setSelectedKey?: (key: string) => void } | undefined;
}

Page({
  data: {
    summary: getProfileSummary()
  },
  onShow(this: ProfilePageInstance) {
    this.getTabBar?.()?.setSelectedKey?.('profile');
    this.refreshSummary();
  },
  refreshSummary(this: ProfilePageInstance) {
    this.setData({
      summary: getProfileSummary()
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
