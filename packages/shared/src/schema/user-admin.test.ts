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
        reasonType: '退款',
        note: '退款扣回',
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

  it('validates merchant adjustment reasons against add and deduct actions', () => {
    const basePayload = {
      userOpenid: 'user-openid',
      operator: {
        openid: 'merchant-openid',
        name: '店主'
      },
      operatedAt: '2026-04-17T12:00:00.000Z',
      requiresConfirmation: true
    };

    expect(isMerchantUserBalanceAdjustmentPayload({
      ...basePayload,
      action: 'add',
      reasonType: '线下收款',
      note: '线下收款入账',
      beforeBalance: 100,
      delta: 50,
      targetBalance: 150,
      afterBalance: 150
    })).toBe(true);
    expect(isMerchantUserBalanceAdjustmentPayload({
      ...basePayload,
      action: 'deduct',
      reasonType: '退款',
      note: '退款扣回',
      beforeBalance: 100,
      delta: -50,
      targetBalance: 50,
      afterBalance: 50
    })).toBe(true);
    expect(isMerchantUserBalanceAdjustmentPayload({
      ...basePayload,
      action: 'add',
      reasonType: '退款',
      note: '方向错误',
      beforeBalance: 100,
      delta: 50,
      targetBalance: 150,
      afterBalance: 150
    })).toBe(false);
    expect(isMerchantUserBalanceAdjustmentPayload({
      ...basePayload,
      action: 'deduct',
      reasonType: '充值',
      note: '方向错误',
      beforeBalance: 100,
      delta: -50,
      targetBalance: 50,
      afterBalance: 50
    })).toBe(false);
  });

  it('rejects direct set-balance adjustments because membership level depends on net recharge composition', () => {
    expect(
      isMerchantUserBalanceAdjustmentPayload({
        userOpenid: 'user-openid',
        action: 'set',
        reasonType: '其他',
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
    ).toBe(false);
  });
});
