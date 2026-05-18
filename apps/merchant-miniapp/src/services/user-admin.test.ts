import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MerchantUserSearchListItem } from '@xiaipet/shared/types/user-admin';

import { MERCHANT_SESSION_STORAGE_KEY } from './api-client';
import {
  buildBalanceAdjustmentDraft,
  getUserDetailViewModel,
  getUsersPageViewModel,
  queryMerchantUsers,
  submitBalanceAdjustment
} from './user-admin';

function createUser(overrides: Partial<MerchantUserSearchListItem> = {}): MerchantUserSearchListItem {
  return {
    openid: 'user-openid',
    avatarUrl: 'https://example.com/avatar.png',
    nickname: '奶油妈妈',
    contactPhoneMasked: '138****1234',
    membershipTierLabel: '金卡会员',
    currentBalance: 188,
    ...overrides
  };
}

describe('user admin service', () => {
  const storage = new Map<string, unknown>();

  beforeEach(() => {
    storage.clear();
    storage.set(MERCHANT_SESSION_STORAGE_KEY, {
      token: 'merchant-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      account: {
        id: 'acct-admin',
        username: 'admin',
        role: 'admin',
        mustChangePassword: false
      }
    });

    vi.stubGlobal('wx', {
      getStorageSync: vi.fn((key: string) => storage.get(key)),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value))
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queries merchant users with the submitted payload', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      users: [createUser()]
    });

    const users = await queryMerchantUsers(
      {
        query: '138',
        searchField: 'phone'
      },
      request
    );

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/users', {
      method: 'GET',
      query: {
        query: '138',
        searchField: 'phone'
      },
      auth: 'merchant'
    });
    expect(users).toHaveLength(1);
  });

  it('queries all merchant users when the search payload is empty', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      users: [createUser()]
    });

    const users = await queryMerchantUsers(
      {
        query: '',
        searchField: 'phone'
      },
      request
    );

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/users', {
      method: 'GET',
      query: {
        query: '',
        searchField: 'phone'
      },
      auth: 'merchant'
    });
    expect(users).toHaveLength(1);
  });

  it('builds lightweight search cards with membership tier and current balance labels', () => {
    const view = getUsersPageViewModel([
      createUser(),
      createUser({
        openid: 'user-openid-2',
        nickname: '布丁妈妈',
        membershipTierLabel: '银卡会员',
        currentBalance: 12
      })
    ]);

    expect(view.isEmpty).toBe(false);
    expect(view.cards[0]).toMatchObject({
      nickname: '奶油妈妈',
      membershipTierLabel: '金卡会员',
      currentBalanceLabel: '￥188.00'
    });
    expect(view.summary).toEqual({
      totalUsers: 2,
      totalBalanceLabel: '￥200.00',
      tierCount: 2
    });
  });

  it('builds adjustment drafts with resulting balance previews and negative-balance blocking', () => {
    const draft = buildBalanceAdjustmentDraft(createUser(), {
      action: 'deduct',
      amountText: '200',
      reasonType: '补偿',
      note: '售后扣回'
    });

    expect(draft.resultingBalanceLabel).toBe('￥-12.00');
    expect(draft.disableSubmitReason).toBe('调整后余额不能小于 0');
  });

  it('submits add, deduct, and set-target adjustments with confirmation and operator identity', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      balanceAfter: 238,
      ledger: {
        normalizedTitle: '商户充值',
        shortNote: '增加 ￥50.00'
      }
    });
    const storageWriter = vi.fn();

    const result = await submitBalanceAdjustment(
      buildBalanceAdjustmentDraft(createUser(), {
        action: 'add',
        amountText: '50',
        reasonType: '充值',
        note: '门店补充储值'
      }),
      request,
      storageWriter
    );

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/users/user-openid/balance-adjustments', {
      method: 'POST',
      body: {
        userOpenid: 'user-openid',
        action: 'add',
        reasonType: '充值',
        note: '门店补充储值',
        operator: {
          openid: 'acct-admin',
          name: 'admin'
        },
        operatedAt: expect.any(String),
        beforeBalance: 188,
        delta: 50,
        targetBalance: 238,
        afterBalance: 238,
        requiresConfirmation: true
      },
      auth: 'merchant'
    });
    expect(storageWriter).toHaveBeenCalled();
    expect(result.balanceAfter).toBe(238);
  });

  it('normalizes legacy balance adjustment responses without freezing the detail page submit state', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      balanceAfter: 1188,
      ledger: {
        ledgerId: 'ledger-1'
      }
    });
    const storageWriter = vi.fn();

    const result = await submitBalanceAdjustment(
      buildBalanceAdjustmentDraft(createUser(), {
        action: 'add',
        amountText: '1000',
        reasonType: '线下收款',
        note: '线下充值了'
      }),
      request,
      storageWriter
    );

    expect(result.balanceAfter).toBe(1188);
    expect(storageWriter).toHaveBeenCalledWith(
      'merchant-user-detail-cache',
      expect.objectContaining({
        'user-openid': expect.objectContaining({
          normalizedTitle: '线下收款',
          shortNote: '增加 ￥1000.00'
        })
      })
    );
  });

  it('builds user detail cards with current balance and latest known operation summary', () => {
    const view = getUserDetailViewModel(createUser(), {
      normalizedTitle: '余额调整',
      shortNote: '增加 ￥50.00',
      operatedAt: '2026-04-18T10:00:00.000Z',
      operatorName: '喜爱宠物烘焙工作室'
    });

    expect(view).toMatchObject({
      currentBalanceLabel: '￥188.00',
      latestOperationTitle: '余额调整',
      latestOperationNote: '增加 ￥50.00'
    });
  });
});
