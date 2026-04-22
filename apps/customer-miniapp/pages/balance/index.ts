declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  getBalanceOverview,
  getMonthlyBalanceGroups,
  type MonthlyBalanceGroup
} from '../../src/services/balance';

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
  refreshBalance(): void;
}

Page({
  data: {
    overview: getBalanceOverview(),
    groups: []
  },
  onShow(this: BalancePageInstance) {
    this.refreshBalance();
  },
  refreshBalance(this: BalancePageInstance) {
    this.setData({
      overview: getBalanceOverview(),
      groups: getMonthlyBalanceGroups()
    });
  }
});
