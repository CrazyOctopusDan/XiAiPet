import { describe, expect, it } from 'vitest';

import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

const merchantUser = {
  openid: 'merchant-openid',
  merchantId: 'merchant-001',
  storeName: '虾衣宠物烘焙工作室',
  enabled: true,
  grantedAt: '2026-04-01T00:00:00.000Z'
};

describe('searchMerchantUsers cloud function', () => {
  it('returns only the lightweight D-19 projection with masked phone output', async () => {
    const result = await main(
      {
        input: {
          query: '1380',
          searchField: 'phone'
        },
        merchantUser
      },
      { OPENID: 'merchant-openid' },
      {
        searchUsers: async () => [
          {
            openid: 'user-openid',
            avatarUrl: 'cloud://avatar.png',
            nickname: '糯米',
            contactPhoneMasked: '138****0000',
            membershipTierLabel: '金卡会员',
            currentBalance: 88
          }
        ]
      }
    );

    expect(result.users).toEqual([
      {
        openid: 'user-openid',
        avatarUrl: 'cloud://avatar.png',
        nickname: '糯米',
        contactPhoneMasked: '138****0000',
        membershipTierLabel: '金卡会员',
        currentBalance: 88
      }
    ]);
  });
});
