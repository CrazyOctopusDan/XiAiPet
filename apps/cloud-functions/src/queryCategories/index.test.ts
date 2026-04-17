import { describe, expect, it } from 'vitest';

import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

describe('queryCategories cloud function', () => {
  it('returns categories with icon tokens and linked-product counts for merchant management', async () => {
    const result = await main(
      {
        merchantUser: {
          openid: 'merchant-openid',
          merchantId: 'merchant-001',
          storeName: '虾衣宠物烘焙工作室',
          enabled: true,
          grantedAt: '2026-04-01T00:00:00.000Z'
        }
      },
      { OPENID: 'merchant-openid' },
      {
        listCategories: async () => [
          {
            id: 'cakes',
            name: '生日蛋糕',
            iconToken: '🎂',
            createdAt: '2026-04-17T10:00:00.000Z',
            updatedAt: '2026-04-17T10:00:00.000Z'
          }
        ],
        countProductsByCategory: async () => 2
      }
    );

    expect(result.categories).toEqual([
      expect.objectContaining({
        id: 'cakes',
        iconToken: '🎂',
        linkedProductCount: 2,
        canDelete: false
      })
    ]);
  });
});
