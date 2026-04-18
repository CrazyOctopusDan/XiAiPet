import { describe, expect, it } from 'vitest';

import {
  getBalanceOverview,
  getMonthlyBalanceGroups
} from './balance';

describe('balance service', () => {
  it('returns grouped monthly ledger sections in reverse chronological order', () => {
    const groups = getMonthlyBalanceGroups();

    expect(groups.map((item) => item.month)).toEqual(['2026-04', '2026-03', '2026-02']);
    expect(groups[0]?.items[0]).toMatchObject({
      id: 'balance-2026-04-1',
      type: 'income'
    });
  });

  it('calculates monthly income and expense totals', () => {
    const april = getMonthlyBalanceGroups()[0];

    expect(april).toMatchObject({
      month: '2026-04',
      totalIncome: 300,
      totalExpense: 88
    });
  });

  it('exposes current balance overview for the balance page header', () => {
    expect(getBalanceOverview()).toMatchObject({
      currentBalance: 268,
      totalIncome: 1038,
      totalExpense: 770
    });
  });

  it('maps merchant adjustments to normalized title plus short note without exposing internal remarks', () => {
    const april = getMonthlyBalanceGroups()[0];
    const merchantAdjustment = april?.items.find((item) => item.id === 'balance-2026-04-1');

    expect(merchantAdjustment).toMatchObject({
      title: '余额纠错',
      note: '余额调整至 ￥180.00',
      rawTitle: '后台人工调整'
    });
    expect(merchantAdjustment?.note).not.toContain('仅商户内部可见');
  });
});
