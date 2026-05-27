import { describe, expect, it, vi } from 'vitest';

import { createMerchantUserService } from './admin-service';

describe('merchant user service', () => {
  it('returns merchant user detail with latest adjustment from the repository', async () => {
    const userRepository = {
      getMerchantUserDetail: vi.fn(async () => ({
        ok: true,
        user: {
          openid: 'openid-1',
          latestAdjustment: {
            normalizedTitle: '线下收款',
            shortNote: '增加 ￥1000.00'
          }
        }
      }))
    };
    const service = createMerchantUserService(userRepository as any, {} as any);

    await expect(service.getMerchantUserDetail({} as any, 'openid-1')).resolves.toMatchObject({
      ok: true,
      user: {
        openid: 'openid-1',
        latestAdjustment: {
          normalizedTitle: '线下收款'
        }
      }
    });
    expect(userRepository.getMerchantUserDetail).toHaveBeenCalledWith('openid-1');
  });

  it('returns the bound user list when the merchant user query is empty', async () => {
    const userRepository = {
      searchUsers: vi.fn(async () => [
        {
          openid: 'openid-1',
          avatarUrl: '',
          nickname: '虾衣宠家长',
          contactPhoneMasked: '188****6099',
          membershipTierLabel: '普通会员',
          currentBalance: 0
        }
      ])
    };
    const service = createMerchantUserService(userRepository as any, {} as any);

    await expect(service.searchMerchantUsers({} as any, {})).resolves.toMatchObject({
      ok: true,
      users: [
        {
          openid: 'openid-1',
          contactPhoneMasked: '188****6099'
        }
      ]
    });
    expect(userRepository.searchUsers).toHaveBeenCalledWith('', 20);
  });

  it('returns balance adjustment display fields expected by the merchant miniapp', async () => {
    const balanceService = {
      adjustBalance: vi.fn(async () => ({
        accountId: 'account-1',
        openid: 'openid-1',
        balanceBefore: 0,
        balanceAfter: 1000,
        ledgerId: 'ledger-1'
      }))
    };
    const service = createMerchantUserService({} as any, balanceService as any);

    await expect(
      service.adjustUserBalance(
        { openid: 'acct-admin', storeName: '门店管理员' } as any,
        'openid-1',
        {
          userOpenid: 'openid-1',
          action: 'add',
          reasonType: '线下收款',
          note: '线下充值了',
          operatedAt: '2026-05-18T11:35:00.000Z',
          delta: 1000
        }
      )
    ).resolves.toMatchObject({
      ok: true,
      balanceAfter: 1000,
      ledger: {
        normalizedTitle: '线下收款',
        shortNote: '增加 ￥1000.00'
      }
    });
    expect(balanceService.adjustBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recharge'
      })
    );
  });

  it('records merchant recharge adjustments as recharge ledger entries for increases and decreases', async () => {
    const balanceService = {
      adjustBalance: vi.fn(async () => ({
        accountId: 'account-1',
        openid: 'openid-1',
        balanceBefore: 0,
        balanceAfter: 1000,
        ledgerId: 'ledger-1'
      }))
    };
    const service = createMerchantUserService({} as any, balanceService as any);

    await service.adjustUserBalance(
      { openid: 'acct-admin', storeName: '门店管理员' } as any,
      'openid-1',
      {
        userOpenid: 'openid-1',
        action: 'add',
        reasonType: '充值',
        note: '线下充值了',
        operatedAt: '2026-05-18T11:35:00.000Z',
        delta: 1000
      }
    );

    expect(balanceService.adjustBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recharge',
        reason: '充值: 线下充值了'
      })
    );

    await service.adjustUserBalance(
      { openid: 'acct-admin', storeName: '门店管理员' } as any,
      'openid-1',
      {
        userOpenid: 'openid-1',
        action: 'deduct',
        reasonType: '退款',
        note: '退款扣回',
        operatedAt: '2026-05-18T11:40:00.000Z',
        delta: -100
      }
    );

    expect(balanceService.adjustBalance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'recharge',
        amountDelta: -100,
        reason: '退款: 退款扣回'
      })
    );

    await service.adjustUserBalance(
      { openid: 'acct-admin', storeName: '门店管理员' } as any,
      'openid-1',
      {
        userOpenid: 'openid-1',
        action: 'add',
        reasonType: '线下收款',
        note: '线下收款入账',
        operatedAt: '2026-05-18T11:45:00.000Z',
        delta: 300
      }
    );

    expect(balanceService.adjustBalance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'recharge',
        amountDelta: 300,
        reason: '线下收款: 线下收款入账'
      })
    );
  });

  it('normalizes merchant balance adjustment money fields to two decimal places before writing ledgers', async () => {
    const balanceService = {
      adjustBalance: vi.fn(async () => ({
        accountId: 'account-1',
        openid: 'openid-1',
        balanceBefore: 0,
        balanceAfter: 50.99,
        ledgerId: 'ledger-1'
      }))
    };
    const service = createMerchantUserService({} as any, balanceService as any);

    await service.adjustUserBalance(
      { openid: 'acct-admin', storeName: '门店管理员' } as any,
      'openid-1',
      {
        userOpenid: 'openid-1',
        action: 'add',
        reasonType: '充值',
        note: '线下充值了',
        operatedAt: '2026-05-18T11:35:00.000Z',
        delta: 50.999
      }
    );

    expect(balanceService.adjustBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        amountDelta: 50.99,
        metadata: expect.objectContaining({
          delta: 50.99
        })
      })
    );
  });

  it('rejects legacy set-target balance adjustments', async () => {
    const balanceService = {
      adjustBalance: vi.fn()
    };
    const service = createMerchantUserService({} as any, balanceService as any);

    await expect(
      service.adjustUserBalance(
        { openid: 'acct-admin', storeName: '门店管理员' } as any,
        'openid-1',
        {
          userOpenid: 'openid-1',
          action: 'set',
          reasonType: '其他',
          note: '指定余额',
          operatedAt: '2026-05-18T11:35:00.000Z',
          delta: 50
        }
      )
    ).rejects.toMatchObject({
      code: 'INVALID_BALANCE_ADJUSTMENT'
    });
    expect(balanceService.adjustBalance).not.toHaveBeenCalled();
  });

  it('rejects balance adjustment reasons that do not match the selected direction', async () => {
    const balanceService = {
      adjustBalance: vi.fn()
    };
    const service = createMerchantUserService({} as any, balanceService as any);

    await expect(
      service.adjustUserBalance(
        { openid: 'acct-admin', storeName: '门店管理员' } as any,
        'openid-1',
        {
          userOpenid: 'openid-1',
          action: 'deduct',
          reasonType: '充值',
          note: '方向错误',
          operatedAt: '2026-05-18T11:35:00.000Z',
          delta: -50
        }
      )
    ).rejects.toMatchObject({
      code: 'INVALID_BALANCE_ADJUSTMENT'
    });
    expect(balanceService.adjustBalance).not.toHaveBeenCalled();
  });
});
