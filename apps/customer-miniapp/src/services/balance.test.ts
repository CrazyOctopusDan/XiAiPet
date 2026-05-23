import { beforeEach, describe, expect, it } from 'vitest';
import type { CustomerApiRequestOptions } from './api-client';

import {
  getBalanceOverview,
  getBalancePagination,
  getMonthlyBalanceGroups,
  hydrateBalance,
  loadMoreBalance,
  resetBalance
} from './balance';

describe('balance service', () => {
  beforeEach(() => {
    resetBalance();
  });

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

  it('hydrates balance overview and ledger records from the customer balance API', async () => {
    const request = async <T>(path: string, options?: CustomerApiRequestOptions) => {
      expect(path).toBe('/api/v1/customer/balance');
      expect(options).toMatchObject({
        method: 'GET',
        auth: 'customer',
        query: {
          cursor: '0',
          limit: '20'
        }
      });
      return {
        ok: true,
        overview: {
          currentBalance: 180,
          totalIncome: 300,
          totalExpense: 120
        },
        records: [
          {
            id: 'ledger-api-1',
            title: '余额纠错',
            rawTitle: '后台人工调整',
            note: '余额调整至 ￥180.00',
            date: '2026-05-01',
            type: 'income',
            amount: 300
          }
        ],
        pagination: {
          nextCursor: '1',
          hasMore: true,
          limit: 20,
          total: 2
        }
      } as T;
    };

    await hydrateBalance(request);

    expect(getBalanceOverview()).toMatchObject({ currentBalance: 180 });
    expect(getMonthlyBalanceGroups()).toEqual([
      expect.objectContaining({
        month: '2026-05',
        totalIncome: 300
      })
    ]);
    expect(getBalancePagination()).toMatchObject({
      nextCursor: '1',
      hasMore: true,
      total: 2
    });
  });

  it('loads more balance records with the saved cursor and appends without duplicates', async () => {
    const request = async <T>(path: string, options?: CustomerApiRequestOptions) => {
      if (options?.query?.cursor === '0') {
        return {
          ok: true,
          overview: {
            currentBalance: 180,
            totalIncome: 300,
            totalExpense: 120
          },
          records: [
            {
              id: 'ledger-api-1',
              title: '充值',
              rawTitle: '会员充值',
              date: '2026-05-02',
              type: 'income',
              amount: 300
            }
          ],
          pagination: {
            nextCursor: '1',
            hasMore: true,
            limit: 20,
            total: 2
          }
        } as T;
      }

      expect(path).toBe('/api/v1/customer/balance');
      expect(options).toMatchObject({
        method: 'GET',
        auth: 'customer',
        query: {
          cursor: '1',
          limit: '20'
        }
      });
      return {
        ok: true,
        records: [
          {
            id: 'ledger-api-2',
            title: '订单抵扣',
            rawTitle: '订单抵扣',
            date: '2026-05-01',
            type: 'expense',
            amount: 120
          }
        ],
        pagination: {
          nextCursor: null,
          hasMore: false,
          limit: 20,
          total: 2
        }
      } as T;
    };

    await hydrateBalance(request);
    await loadMoreBalance(request);

    expect(getMonthlyBalanceGroups()[0]?.items.map((item) => item.id)).toEqual([
      'ledger-api-1',
      'ledger-api-2'
    ]);
    expect(getBalancePagination().hasMore).toBe(false);
  });
});
