import { describe, expect, it, vi } from 'vitest';

import { createUserRepository } from './repository';

describe('user repository', () => {
  it('hydrates customer profile totalSpent from orders and member level from recharge totals', async () => {
    const upsert = vi.fn(async () => ({
      openid: 'openid-1',
      status: 'ACTIVE',
      phoneBindingState: 'BOUND',
      contactPhoneMasked: '188****6099',
      contactPhoneCountryCode: '+86',
      lastLoginAt: new Date('2026-05-22T00:00:00.000Z'),
      createdAt: new Date('2026-05-22T00:00:00.000Z'),
      updatedAt: new Date('2026-05-22T00:00:00.000Z'),
      profile: null
    }));
    const aggregate = vi.fn(async () => ({
      _sum: {
        payableTotal: {
          toNumber: () => 932
        }
      }
    }));
    const rechargeAggregate = vi.fn(async () => ({
      _sum: {
        amountDelta: {
          toNumber: () => 800
        }
      }
    }));
    const repository = createUserRepository({
      user: {
        upsert,
        findUnique: vi.fn(async () => ({
          openid: 'openid-1',
          status: 'ACTIVE',
          phoneBindingState: 'BOUND',
          contactPhoneEncrypted: '18811736099',
          contactPhoneMasked: '188****6099',
          contactPhoneCountryCode: '+86',
          lastLoginAt: new Date('2026-05-22T00:00:00.000Z'),
          createdAt: new Date('2026-05-22T00:00:00.000Z'),
          updatedAt: new Date('2026-05-22T00:00:00.000Z'),
          profile: {
            nickname: 'Cookie大爹'
          },
          balanceAccount: {
            balance: {
              toNumber: () => 932
            }
          }
        }))
      },
      order: {
        aggregate
      },
      balanceLedger: {
        aggregate: rechargeAggregate
      },
      runtimeConfigSection: {
        findUnique: vi.fn(async () => ({
          id: 'membership-tiers',
          value: {
            tiers: [
              {
                tierId: 'standard',
                threshold: 0,
                name: '普通会员',
                description: '默认等级'
              },
              {
                tierId: 'gold',
                threshold: 1000,
                name: '金卡会员',
                description: '充值满 1000 元'
              }
            ]
          }
        }))
      }
    } as any);

    await expect(repository.getCustomerProfile('openid-1')).resolves.toMatchObject({
      nickname: 'Cookie大爹',
      memberLevel: '普通会员',
      balance: 932,
      totalSpent: 932,
      totalRecharge: 800,
      contactPhone: '18811736099',
      contactPhoneMasked: '188****6099'
    });
    expect(aggregate).toHaveBeenCalledWith({
      where: {
        openid: 'openid-1',
        status: 'PAID'
      },
      _sum: {
        payableTotal: true
      }
    });
    expect(rechargeAggregate).toHaveBeenCalledWith({
      where: {
        openid: 'openid-1',
        OR: [
          { type: 'RECHARGE' },
          {
            type: 'MANUAL_ADJUSTMENT',
            reason: {
              startsWith: '充值'
            }
          },
          {
            type: 'MANUAL_ADJUSTMENT',
            reason: {
              startsWith: '线下收款'
            }
          },
          {
            type: 'MANUAL_ADJUSTMENT',
            reason: {
              startsWith: '退款'
            }
          }
        ]
      },
      _sum: {
        amountDelta: true
      }
    });
  });

  it('loads merchant user detail with full contact phone and section counts', async () => {
    const repository = createUserRepository({
      user: {
        findUnique: vi.fn(async () => ({
          openid: 'openid-1',
          status: 'active',
          phoneBindingState: 'BOUND',
          contactPhoneEncrypted: '18811736099',
          contactPhoneMasked: '188****6099',
          contactPhoneCountryCode: '+86',
          lastLoginAt: new Date('2026-05-16T00:00:00.000Z'),
          createdAt: new Date('2026-05-16T00:00:00.000Z'),
          updatedAt: new Date('2026-05-18T11:35:00.000Z'),
          profile: {
            nickname: '虾衣宠家长'
          },
          balanceAccount: {
            balance: {
              toNumber: () => 1000
            }
          }
        }))
      },
      balanceLedger: {
        aggregate: vi.fn(async () => ({
          _sum: {
            amountDelta: {
              toNumber: () => 1200
            }
          }
        })),
        count: vi.fn(async () => 2),
        findMany: vi.fn(async () => [
          {
            id: 'ledger-2',
            type: 'MANUAL_ADJUSTMENT',
            amountDelta: {
              toNumber: () => -100
            },
            balanceBefore: {
              toNumber: () => 1100
            },
            balanceAfter: {
              toNumber: () => 1000
            },
            reason: '人工纠错: 扣回误充值',
            operatorName: 'admin',
            createdAt: new Date('2026-05-19T11:35:00.000Z')
          }
        ])
      },
      address: {
        count: vi.fn(async () => 1)
      },
      pet: {
        findMany: vi.fn(async () => [
          {
            id: 'pet-1',
            name: 'Cookie',
            birthday: new Date('2024-05-09T00:00:00.000Z'),
            profile: {
              gender: 'female',
              allergyNotes: '不吃鸡肉'
            }
          }
        ])
      },
      runtimeConfigSection: {
        findUnique: vi.fn(async () => ({
          id: 'membership-tiers',
          value: {
            tiers: [
              {
                tierId: 'standard',
                threshold: 0,
                name: '普通会员',
                description: '默认等级'
              },
              {
                tierId: 'gold',
                threshold: 1000,
                name: '金卡会员',
                description: '充值满 1000 元'
              }
            ]
          }
        }))
      }
    } as any);

    await expect(repository.getMerchantUserDetail('openid-1')).resolves.toMatchObject({
      ok: true,
      user: {
        openid: 'openid-1',
        contactPhone: '18811736099',
        membershipTierLabel: '金卡会员',
        currentBalance: 1000,
        latestAdjustment: {
          normalizedTitle: '人工纠错',
          shortNote: '扣减 ￥100.00',
          operatorName: 'admin',
          operatedAt: '2026-05-19T11:35:00.000Z'
        },
        addressCount: 1,
        petCount: 1,
        pets: [
          {
            id: 'pet-1',
            name: 'Cookie',
            birthday: '2024-05-09',
            allergyNotes: '不吃鸡肉'
          }
        ],
        balanceLedgerCount: 2,
        balanceLedgers: [],
        addresses: []
      }
    });
  });

  it('loads merchant user addresses without pagination', async () => {
    const repository = createUserRepository({
      address: {
        findMany: vi.fn(async () => [
          {
            id: 'addr-1',
            recipientName: 'Cookie大爹',
            phoneMasked: '18811736099',
            regionLabel: '浙江省 嘉兴市 南湖区',
            detailAddress: '香樟国际 17幢805',
            tag: '家',
            isDefault: true,
            snapshot: {
              type: 'city',
              phoneNumber: '18811736099'
            }
          }
        ])
      }
    } as any);

    await expect(repository.getMerchantUserAddresses('openid-1')).resolves.toEqual({
      ok: true,
      addresses: [
        {
          id: 'addr-1',
          type: 'city',
          recipientName: 'Cookie大爹',
          phoneNumber: '18811736099',
          regionLabel: '浙江省 嘉兴市 南湖区',
          detailAddress: '香樟国际 17幢805',
          tag: '家',
          isDefault: true
        }
      ]
    });
  });

  it('loads merchant user balance ledgers with offset pagination', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'ledger-2',
        type: 'MANUAL_ADJUSTMENT',
        amountDelta: {
          toNumber: () => -100
        },
        balanceBefore: {
          toNumber: () => 1100
        },
        balanceAfter: {
          toNumber: () => 1000
        },
        reason: '人工纠错: 扣回误充值',
        operatorName: 'admin',
        createdAt: new Date('2026-05-19T11:35:00.000Z')
      }
    ]);
    const repository = createUserRepository({
      balanceLedger: {
        count: vi.fn(async () => 3),
        findMany
      }
    } as any);

    await expect(repository.getMerchantUserBalanceLedgers('openid-1', { cursor: '1', limit: '1' })).resolves.toMatchObject({
      ok: true,
      records: [
        expect.objectContaining({
          id: 'ledger-2',
          amountDelta: -100,
          balanceBefore: 1100,
          balanceAfter: 1000
        })
      ],
      pagination: {
        nextCursor: '2',
        hasMore: true,
        limit: 1,
        total: 3
      }
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        take: 1
      })
    );
  });

  it('lists bound merchant users when no search query is provided', async () => {
    const findMany = vi.fn(async () => []);
    const repository = createUserRepository({
      user: {
        findMany
      }
    } as any);

    await expect(repository.searchUsers('')).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          phoneBindingState: 'BOUND'
        },
        take: 20
      })
    );
  });

  it('matches merchant user search by a full phone number against the masked phone stored on users', async () => {
    const findMany = vi.fn(async () => [
      {
        openid: 'openid-phone',
        status: 'active',
        phoneBindingState: 'bound',
        contactPhoneMasked: '138****8000',
        contactPhoneCountryCode: '+86',
        lastLoginAt: new Date('2026-05-16T00:00:00.000Z'),
        createdAt: new Date('2026-05-16T00:00:00.000Z'),
        updatedAt: new Date('2026-05-16T00:00:00.000Z'),
        profile: {
          nickname: '手机号会员'
        },
        balanceAccount: null
      }
    ]);
    const repository = createUserRepository({
      user: {
        findMany
      }
    } as any);

    await expect(repository.searchUsers('13800138000')).resolves.toEqual([
      {
        openid: 'openid-phone',
        avatarUrl: '',
        nickname: '手机号会员',
        contactPhoneMasked: '138****8000',
        contactPhone: undefined,
        membershipTierLabel: '普通会员',
        currentBalance: 0
      }
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          phoneBindingState: 'BOUND',
          OR: expect.arrayContaining([
            { contactPhoneMasked: { contains: '138****8000' } }
          ])
        })
      })
    );
  });

  it('projects saved customer profile fields into merchant user search results', async () => {
    const repository = createUserRepository({
      user: {
        findMany: vi.fn(async () => [
          {
            openid: 'openid-1',
            status: 'active',
            phoneBindingState: 'bound',
            contactPhoneEncrypted: '13800131234',
            contactPhoneMasked: '138****1234',
            contactPhoneCountryCode: '+86',
            lastLoginAt: new Date('2026-05-16T00:00:00.000Z'),
            createdAt: new Date('2026-05-16T00:00:00.000Z'),
            updatedAt: new Date('2026-05-16T00:00:00.000Z'),
            profile: {
              nickname: 'Lucky 家长',
              avatarText: 'L'
            },
            balanceAccount: {
              balance: {
                toNumber: () => 28
              }
            }
          }
        ])
      }
    } as any);

    await expect(repository.searchUsers('Lucky')).resolves.toEqual([
      {
        openid: 'openid-1',
        avatarUrl: 'L',
        nickname: 'Lucky 家长',
        contactPhoneMasked: '138****1234',
        contactPhone: '13800131234',
        membershipTierLabel: '普通会员',
        currentBalance: 28
      }
    ]);
  });
});
