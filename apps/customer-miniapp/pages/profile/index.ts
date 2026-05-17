declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getProfileSummary, hydrateProfile } from '../../src/services/profile';

interface ProfilePageData {
  summary: ReturnType<typeof getProfileSummary>;
  profileSafeTop: number;
}

interface ProfilePageInstance {
  data: ProfilePageData;
  setData(data: Record<string, unknown>): void;
  refreshSummary(): Promise<void>;
  refreshLayoutMetrics(): void;
  getTabBar?(): { setSelectedKey?: (key: string) => void } | undefined;
}

function resolveProfileSafeTop() {
  const fallbackRpx = 144;
  const windowInfo = wx.getWindowInfo?.() ?? wx.getSystemInfoSync?.();
  const menuButton = wx.getMenuButtonBoundingClientRect?.();
  const windowWidth = Number(windowInfo?.windowWidth ?? 0);
  const menuBottom = Number(menuButton?.bottom ?? 0);

  if (!windowWidth || !menuBottom) {
    return fallbackRpx;
  }

  return Math.ceil(((menuBottom + 16) * 750) / windowWidth);
}

Page({
  data: {
    summary: getProfileSummary(),
    profileSafeTop: 144
  },
  onShow(this: ProfilePageInstance) {
    this.getTabBar?.()?.setSelectedKey?.('profile');
    this.refreshLayoutMetrics();
    void this.refreshSummary();
  },
  refreshLayoutMetrics(this: ProfilePageInstance) {
    this.setData({
      profileSafeTop: resolveProfileSafeTop()
    });
  },
  async refreshSummary(this: ProfilePageInstance) {
    try {
      await hydrateProfile();
    } catch {
      // Keep the latest local profile snapshot visible if the network is unavailable.
    }
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
  },
  handleProfileFactTap(event: { currentTarget?: { dataset?: { target?: string } } }) {
    const target = event.currentTarget?.dataset?.target;

    if (target === 'birthday' || target === 'contact') {
      wx.navigateTo({
        url: '/pages/profile-detail/index'
      });
    }
  }
});
