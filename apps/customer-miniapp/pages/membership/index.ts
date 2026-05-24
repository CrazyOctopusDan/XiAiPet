declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  buildMembershipTierCards,
  getCachedCustomerRuntimeConfig,
  hydrateCustomerRuntimeConfig,
  type MembershipTierCardViewModel
} from '../../src/services/runtime-config';

interface MembershipPageInstance {
  data: {
    tiers: MembershipTierCardViewModel[];
    currentIndex: number;
    loading: boolean;
  };
  setData(data: Record<string, unknown>): void;
  refreshMembership(): Promise<void>;
}

function getMembershipTiersView() {
  return buildMembershipTierCards(getCachedCustomerRuntimeConfig().membershipTiers.tiers);
}

Page({
  data: {
    tiers: getMembershipTiersView(),
    currentIndex: 0,
    loading: false
  },
  onShow(this: MembershipPageInstance) {
    void this.refreshMembership();
  },
  async refreshMembership(this: MembershipPageInstance) {
    this.setData({ loading: true });
    try {
      await hydrateCustomerRuntimeConfig();
    } catch {
      // Keep the membership section empty if the runtime config API is unavailable.
    }

    this.setData({
      tiers: getMembershipTiersView(),
      loading: false
    });
  },
  handleTierChange(this: MembershipPageInstance, event: { detail?: { current?: number } }) {
    this.setData({
      currentIndex: event.detail?.current ?? 0
    });
  },
  handleBackTap() {
    wx.navigateBack();
  }
});
