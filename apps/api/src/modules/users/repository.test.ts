import { describe, expect, it, vi } from 'vitest';

import { createUserRepository } from './repository';

describe('user repository', () => {
  it('projects saved customer profile fields into merchant user search results', async () => {
    const repository = createUserRepository({
      user: {
        findMany: vi.fn(async () => [
          {
            openid: 'openid-1',
            status: 'active',
            phoneBindingState: 'bound',
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
        membershipTierLabel: '普通会员',
        currentBalance: 28
      }
    ]);
  });
});
