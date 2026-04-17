import { describe, expect, it, vi } from 'vitest';

import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

const merchantUser = {
  openid: 'merchant-openid',
  merchantId: 'merchant-001',
  storeName: '虾衣宠物烘焙工作室',
  enabled: true,
  grantedAt: '2026-04-01T00:00:00.000Z'
};

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    basicInfo: {
      productId: 'birthday-cake',
      name: '生日蛋糕',
      description: '适合生日庆祝',
      categoryId: 'cakes',
      imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake.png',
      imagePreviewUrl: 'https://example.com/tmp.png',
      memberLevelId: 'vip',
      stock: 12
    },
    pricing: {
      basePrice: 198,
      specs: [
        {
          id: 'six-inch',
          label: '6 寸',
          surcharge: 0
        }
      ],
      formulas: [
        {
          id: 'beef',
          label: '牛肉',
          surcharge: 10
        }
      ],
      overrides: [],
      purchaseLimit: {
        enabled: true,
        maxQuantity: 2
      },
      detailContent: '蛋糕详情说明'
    },
    publishSettings: {
      status: 'draft',
      fulfillmentModes: ['delivery', 'pickup'],
      trackInventory: true
    },
    ...overrides
  };
}

describe('upsertProduct cloud function', () => {
  it('accepts a canonical CloudBase imageFileId and persists the backend product contract', async () => {
    const saveProduct = vi.fn(async (product) => product);
    const result = await main(
      {
        payload: createPayload(),
        merchantUser,
        now: '2026-04-17T10:00:00.000Z'
      },
      { OPENID: 'merchant-openid' },
      {
        saveProduct,
        getProductById: async () => null,
        categoryExists: async () => true
      }
    );

    expect(result.product).toMatchObject({
      id: 'birthday-cake',
      imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake.png',
      detailContent: '蛋糕详情说明'
    });
    expect(saveProduct).toHaveBeenCalled();
  });

  it('rejects temp urls, raw upload placeholders, or missing image references', async () => {
    await expect(
      main(
        {
          payload: createPayload({
            basicInfo: {
              ...createPayload().basicInfo,
              imageFileId: 'https://example.com/tmp.png'
            }
          }),
          merchantUser
        },
        { OPENID: 'merchant-openid' },
        {
          saveProduct: async (product) => product,
          getProductById: async () => null,
          categoryExists: async () => true
        }
      )
    ).rejects.toThrow('INVALID_PRODUCT_PAYLOAD');
  });

  it('replaces the stored imageFileId only through the backend save path', async () => {
    const saveProduct = vi.fn(async (product) => product);
    const result = await main(
      {
        payload: createPayload({
          basicInfo: {
            ...createPayload().basicInfo,
            imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake-v2.png'
          }
        }),
        merchantUser,
        now: '2026-04-17T11:00:00.000Z'
      },
      { OPENID: 'merchant-openid' },
      {
        saveProduct,
        getProductById: async () => ({
          id: 'birthday-cake',
          name: '生日蛋糕',
          description: '适合生日庆祝',
          categoryId: 'cakes',
          imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake-v1.png',
          memberLevelId: 'vip',
          status: 'draft',
          stock: 12,
          trackInventory: true,
          fulfillmentModes: ['delivery'],
          basePrice: 198,
          specs: [],
          formulas: [],
          priceOverrides: [],
          purchaseLimit: { enabled: false, maxQuantity: null },
          detailContent: '旧详情',
          createdAt: '2026-04-16T10:00:00.000Z',
          updatedAt: '2026-04-16T10:00:00.000Z'
        }),
        categoryExists: async () => true
      }
    );

    expect(result.product.imageFileId).toBe('cloud://xiaipet-prod.123/products/birthday-cake-v2.png');
    expect(saveProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake-v2.png'
      })
    );
  });

  it('enforces pricing, purchase limits, detail content, and single-category linkage', async () => {
    const result = await main(
      {
        payload: createPayload({
          pricing: {
            ...createPayload().pricing,
            overrides: [
              {
                specId: 'six-inch',
                formulaId: 'beef',
                price: 218
              }
            ]
          }
        }),
        merchantUser
      },
      { OPENID: 'merchant-openid' },
      {
        saveProduct: async (product) => product,
        getProductById: async () => null,
        categoryExists: async () => true
      }
    );

    expect(result.product).toMatchObject({
      categoryId: 'cakes',
      purchaseLimit: {
        enabled: true,
        maxQuantity: 2
      },
      detailContent: '蛋糕详情说明',
      priceOverrides: [
        {
          specId: 'six-inch',
          formulaId: 'beef',
          price: 218
        }
      ]
    });
  });
});
