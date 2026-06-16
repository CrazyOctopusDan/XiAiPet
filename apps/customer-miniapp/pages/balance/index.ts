declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  getBalanceOverview,
  getBalancePagination,
  getMonthlyBalanceGroups,
  hydrateBalance,
  loadMoreBalance,
  type MonthlyBalanceGroup
} from '../../src/services/balance';
import { getPhoneBindingRedirectUrl, hasBoundPhone, hydrateProfile } from '../../src/services/profile';

interface BalancePageData {
  overview: {
    currentBalance: number;
    totalIncome: number;
    totalExpense: number;
  };
  groups: MonthlyBalanceGroup[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
}

interface BalancePageInstance {
  data: BalancePageData;
  setData(data: Record<string, unknown>): void;
  refreshBalance(): Promise<void>;
  loadMoreRecords(): Promise<void>;
}

Page({
  data: {
    overview: getBalanceOverview(),
    groups: [],
    loading: false,
    loadingMore: false,
    hasMore: getBalancePagination().hasMore
  },
  onShow(this: BalancePageInstance) {
    void this.refreshBalance();
  },
  async refreshBalance(this: BalancePageInstance) {
    this.setData({
      overview: getBalanceOverview(),
      groups: getMonthlyBalanceGroups(),
      hasMore: getBalancePagination().hasMore,
      loading: true
    });

    try {
      await hydrateProfile();
    } catch {
      // Keep the local profile snapshot when the network is unavailable.
    }

    if (!hasBoundPhone()) {
      wx.redirectTo({
        url: getPhoneBindingRedirectUrl('/pages/balance/index')
      });
      this.setData({ loading: false });
      return;
    }

    try {
      await hydrateBalance();
    } catch {
      // Keep the latest local ledger snapshot visible if the network is unavailable.
    }
    this.setData({
      overview: getBalanceOverview(),
      groups: getMonthlyBalanceGroups(),
      hasMore: getBalancePagination().hasMore,
      loading: false
    });
  },
  async loadMoreRecords(this: BalancePageInstance) {
    if (this.data.loading || this.data.loadingMore || !this.data.hasMore) {
      return;
    }

    this.setData({ loadingMore: true });
    try {
      await loadMoreBalance();
    } catch {
      // Keep the current visible page if loading more fails.
    }
    this.setData({
      overview: getBalanceOverview(),
      groups: getMonthlyBalanceGroups(),
      hasMore: getBalancePagination().hasMore,
      loadingMore: false
    });
  },
  handleRechargeTap() {
    wx.navigateTo({
      url: '/pages/recharge/index'
    });
  },
  onReachBottom(this: BalancePageInstance) {
    void this.loadMoreRecords();
  }
});
