declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getPhoneBindingRedirectUrl, getProfileSummary, hasBoundPhone, hydrateProfile } from '../../src/services/profile';
import {
  buildMembershipTierCards,
  findMembershipTierCard,
  findMembershipTierCardByRecharge,
  getCachedCustomerRuntimeConfig,
  hydrateCustomerRuntimeConfig
} from '../../src/services/runtime-config';

interface ProfilePageData {
  summary: ReturnType<typeof getProfileSummary>;
  membershipCardStyle: string;
  membershipCardName: string;
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

function getProfileMembershipCard(summary = getProfileSummary()) {
  const cards = buildMembershipTierCards(getCachedCustomerRuntimeConfig().membershipTiers.tiers);
  return findMembershipTierCardByRecharge(cards, summary.totalRecharge) ?? findMembershipTierCard(cards, summary.memberLevel);
}

Page({
  data: {
    summary: getProfileSummary(),
    membershipCardStyle: getProfileMembershipCard()?.cardStyle ?? '',
    membershipCardName: getProfileMembershipCard()?.name ?? getProfileSummary().memberLevel,
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
      await Promise.all([
        hydrateProfile(),
        hydrateCustomerRuntimeConfig()
      ]);
    } catch {
      // Keep the latest local profile snapshot visible if the network is unavailable.
    }
    const summary = getProfileSummary();
    const membershipCard = getProfileMembershipCard(summary);

    this.setData({
      summary,
      membershipCardStyle: membershipCard?.cardStyle ?? '',
      membershipCardName: membershipCard?.name ?? summary.memberLevel
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
    if (!hasBoundPhone()) {
      wx.navigateTo({
        url: getPhoneBindingRedirectUrl('/pages/balance/index')
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/balance/index'
    });
  },
  async handleRechargeTap() {
    if (!hasBoundPhone()) {
      try {
        await hydrateProfile();
      } catch {
        // Keep the local registration state when profile hydration is unavailable.
      }
    }

    if (!hasBoundPhone()) {
      const result = await wx.showModal({
        title: '请先完善用户信息',
        content: '绑定手机号才可以成为我们的会员，享受店内服务。',
        confirmText: '去完善',
        cancelText: '稍后再说',
        confirmColor: '#40535C'
      });

      if (result?.confirm) {
        wx.navigateTo({
          url: getPhoneBindingRedirectUrl('/pages/recharge/index')
        });
      }
      return;
    }

    wx.navigateTo({
      url: '/pages/recharge/index'
    });
  },
  handleGiftsTap() {
    wx.navigateTo({
      url: '/pages/my-gifts/index'
    });
  }
});
