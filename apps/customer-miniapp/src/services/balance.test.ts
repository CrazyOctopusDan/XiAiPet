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

  it('starts new users with no local balance ledger records', () => {
    const groups = getMonthlyBalanceGroups();

    expect(groups).toEqual([]);
  });

  it('exposes a zero balance overview before the customer balance API is loaded', () => {
    expect(getBalanceOverview()).toMatchObject({
      currentBalance: 0,
      totalIncome: 0,
      totalExpense: 0
    });
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
        totalIncome: 300,
        items: [
          expect.objectContaining({
            id: 'ledger-api-1',
            title: '余额纠错',
            note: '余额调整至 ￥180.00',
            rawTitle: '后台人工调整'
          })
        ]
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
