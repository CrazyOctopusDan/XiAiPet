declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  getBalanceOverview,
  getMonthlyBalanceGroups,
  hydrateBalance,
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
}

interface BalancePageInstance {
  data: BalancePageData;
  setData(data: Record<string, unknown>): void;
  refreshBalance(): Promise<void>;
}

Page({
  data: {
    overview: getBalanceOverview(),
    groups: []
  },
  onShow(this: BalancePageInstance) {
    void this.refreshBalance();
  },
  async refreshBalance(this: BalancePageInstance) {
    this.setData({
      overview: getBalanceOverview(),
      groups: getMonthlyBalanceGroups()
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
      return;
    }

    try {
      await hydrateBalance();
    } catch {
      // Keep the latest local ledger snapshot visible if the network is unavailable.
    }
    this.setData({
      overview: getBalanceOverview(),
      groups: getMonthlyBalanceGroups()
    });
  }
});
