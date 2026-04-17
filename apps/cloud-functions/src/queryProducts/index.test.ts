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

describe('queryProducts cloud function', () => {
  it('supports category-first browsing for merchant product management', async () => {
    const result = await main(
      {
        categoryId: 'cakes',
        merchantUser
      },
      { OPENID: 'merchant-openid' },
      {
        listProducts: async () => [
          {
            id: 'cake-1',
            name: '生日蛋糕',
            description: '适合生日庆祝',
            categoryId: 'cakes',
            imageFileId: 'cloud://xiaipet-prod.123/products/cake-1.png',
            memberLevelId: null,
            status: 'published',
            stock: 10,
            trackInventory: true,
            fulfillmentModes: ['delivery'],
            basePrice: 198,
            specs: [],
            formulas: [],
            priceOverrides: [],
            purchaseLimit: { enabled: false, maxQuantity: null },
            detailContent: '生日蛋糕详情',
            createdAt: '2026-04-17T09:00:00.000Z',
            updatedAt: '2026-04-17T10:00:00.000Z'
          },
          {
            id: 'snack-1',
            name: '冻干零食',
            description: '零食',
            categoryId: 'snacks',
            imageFileId: 'cloud://xiaipet-prod.123/products/snack-1.png',
            memberLevelId: null,
            status: 'draft',
            stock: 10,
            trackInventory: true,
            fulfillmentModes: ['delivery'],
            basePrice: 38,
            specs: [],
            formulas: [],
            priceOverrides: [],
            purchaseLimit: { enabled: false, maxQuantity: null },
            detailContent: '零食详情',
            createdAt: '2026-04-17T09:00:00.000Z',
            updatedAt: '2026-04-17T10:00:00.000Z'
          }
        ]
      }
    );

    expect(result.products).toHaveLength(1);
    expect(result.products[0].categoryId).toBe('cakes');
  });
});
