import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MerchantUserSearchListItem } from '@xiaipet/shared/types/user-admin';

import { MERCHANT_SESSION_STORAGE_KEY } from './api-client';
import {
  buildBalanceAdjustmentDraft,
  fetchMerchantUserAddresses,
  fetchMerchantUserBalanceLedgers,
  fetchMerchantUserDetail,
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
    contactPhone: '13800131234',
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
      contactPhoneLabel: '13800131234',
      membershipTierLabel: '金卡会员',
      currentBalanceLabel: '￥188.00'
    });
    expect(view.summary).toEqual({
      totalUsers: 2,
      totalBalanceLabel: '￥200.00',
      tierCount: 2
    });
  });

  it('fetches merchant user detail with latest adjustment from the backend', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      user: {
        ...createUser({ currentBalance: 1000 }),
        latestAdjustment: {
          normalizedTitle: '线下收款',
          shortNote: '增加 ￥1000.00',
          operatedAt: '2026-05-18T11:35:00.000Z',
          operatorName: 'admin'
        },
        addressCount: 1,
        balanceLedgerCount: 2,
        balanceLedgers: [],
        addresses: []
      }
    });

    await expect(fetchMerchantUserDetail('user-openid', request)).resolves.toMatchObject({
      openid: 'user-openid',
      currentBalance: 1000,
      latestAdjustment: {
        normalizedTitle: '线下收款'
      }
    });
    expect(request).toHaveBeenCalledWith('/api/v1/merchant/users/user-openid', {
      method: 'GET',
      auth: 'merchant'
    });
  });

  it('fetches merchant user addresses without pagination', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      addresses: [
        {
          id: 'addr-1',
          type: 'city',
          recipientName: '奶油妈妈',
          phoneNumber: '13800131234',
          regionLabel: '上海市 静安区',
          detailAddress: '南京西路 1266 号',
          tag: '家',
          isDefault: true
        }
      ]
    });

    await expect(fetchMerchantUserAddresses('user-openid', request)).resolves.toHaveLength(1);
    expect(request).toHaveBeenCalledWith('/api/v1/merchant/users/user-openid/addresses', {
      method: 'GET',
      auth: 'merchant'
    });
  });

  it('fetches merchant user balance ledgers with cursor pagination', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      records: [],
      pagination: {
        nextCursor: '20',
        hasMore: true,
        limit: 20,
        total: 48
      }
    });

    await expect(fetchMerchantUserBalanceLedgers('user-openid', { cursor: '0', limit: 20 }, request)).resolves.toMatchObject({
      pagination: {
        nextCursor: '20',
        hasMore: true,
        total: 48
      }
    });
    expect(request).toHaveBeenCalledWith('/api/v1/merchant/users/user-openid/balance-ledgers', {
      method: 'GET',
      query: {
        cursor: '0',
        limit: '20'
      },
      auth: 'merchant'
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

  it('builds user detail cards with basic info, address rows, and full balance ledger rows', () => {
    const view = getUserDetailViewModel({
      ...createUser(),
      addresses: [
        {
          id: 'addr-1',
          type: 'city',
          recipientName: '奶油妈妈',
          phoneNumber: '13800131234',
          regionLabel: '上海市 静安区',
          detailAddress: '南京西路 1266 号',
          tag: '家',
          isDefault: true
        }
      ],
      balanceLedgers: [
        {
          id: 'ledger-1',
          normalizedTitle: '余额调整',
          shortNote: '增加 ￥50.00',
          amountDelta: 50,
          balanceBefore: 138,
          balanceAfter: 188,
          operatedAt: '2026-04-18T10:00:00.000Z',
          operatorName: '喜爱宠物烘焙工作室'
        }
      ]
    }, {
      normalizedTitle: '余额调整',
      shortNote: '增加 ￥50.00',
      operatedAt: '2026-04-18T10:00:00.000Z',
      operatorName: '喜爱宠物烘焙工作室'
    });

    expect(view).toMatchObject({
      currentBalanceLabel: '￥188.00',
      contactPhoneLabel: '13800131234',
      latestOperationTitle: '余额调整',
      latestOperationNote: '增加 ￥50.00',
      basicRows: expect.arrayContaining([
        { label: '手机号', value: '13800131234' }
      ]),
      addressRows: [
        expect.objectContaining({
          typeLabel: '配送地址',
          recipientLabel: '奶油妈妈',
          isDefault: true
        })
      ],
      ledgerRows: [
        expect.objectContaining({
          id: 'ledger-1',
          amountLabel: '+￥50.00',
          balanceAfterLabel: '余额 ￥188.00',
          tone: 'income'
        })
      ],
      detailTabs: [
        { key: 'basic', label: '基本信息', countLabel: '3' },
        { key: 'addresses', label: '地址信息', countLabel: '1' },
        { key: 'ledger', label: '余额流水', countLabel: '1' }
      ]
    });
    expect(view.basicRows.some((row) => row.label === 'OpenID')).toBe(false);
  });
});
