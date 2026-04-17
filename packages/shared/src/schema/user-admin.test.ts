import { describe, expect, it } from 'vitest';

import {
  isMerchantUserBalanceAdjustmentPayload,
  isMerchantUserSearchInput,
  isMerchantUserSearchResult
} from './user-admin';

describe('merchant user admin contracts', () => {
  it('supports explicit phone-or-name lookup and only accepts the lightweight D-19 projection', () => {
    expect(
      isMerchantUserSearchInput({
        query: '13800000000',
        searchField: 'phone'
      })
    ).toBe(true);

    expect(
      isMerchantUserSearchInput({
        query: '糯米',
        searchField: 'name'
      })
    ).toBe(true);

    expect(
      isMerchantUserSearchResult({
        users: [
          {
            openid: 'user-openid',
            avatarUrl: 'cloud://avatar/file.png',
            nickname: '糯米',
            contactPhoneMasked: '138****0000',
            membershipTierLabel: '金卡会员',
            currentBalance: 88
          }
        ]
      })
    ).toBe(true);

    expect(
      isMerchantUserSearchResult({
        users: [
          {
            openid: 'user-openid',
            avatarUrl: 'cloud://avatar/file.png',
            nickname: '糯米',
            contactPhoneMasked: '138****0000',
            membershipTierLabel: '金卡会员',
            currentBalance: 88,
            contactPhone: '13800000000'
          }
        ]
      })
    ).toBe(false);
  });

  it('requires audited balance adjustments and rejects negative resulting balances', () => {
    expect(
      isMerchantUserBalanceAdjustmentPayload({
        userOpenid: 'user-openid',
        action: 'deduct',
        reasonType: '人工纠错',
        note: '修正重复到账金额',
        operator: {
          openid: 'merchant-openid',
          name: '店主'
        },
        operatedAt: '2026-04-17T12:00:00.000Z',
        beforeBalance: 120,
        delta: -20,
        targetBalance: 100,
        afterBalance: 100,
        requiresConfirmation: true
      })
    ).toBe(true);

    expect(
      isMerchantUserBalanceAdjustmentPayload({
        userOpenid: 'user-openid',
        action: 'deduct',
        reasonType: '退款',
        note: '错误原因类型',
        operator: {
          openid: 'merchant-openid',
          name: '店主'
        },
        operatedAt: '2026-04-17T12:00:00.000Z',
        beforeBalance: 120,
        delta: -20,
        targetBalance: -1,
        afterBalance: -1,
        requiresConfirmation: true
      })
    ).toBe(false);
  });

  it('treats direct set-balance as a first-class action alongside add and deduct', () => {
    expect(
      isMerchantUserBalanceAdjustmentPayload({
        userOpenid: 'user-openid',
        action: 'set',
        reasonType: '补偿',
        note: '线下修正到确认后的余额',
        operator: {
          openid: 'merchant-openid',
          name: '店主'
        },
        operatedAt: '2026-04-17T12:00:00.000Z',
        beforeBalance: 30,
        delta: 50,
        targetBalance: 80,
        afterBalance: 80,
        requiresConfirmation: true
      })
    ).toBe(true);
  });
});
