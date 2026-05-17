import { describe, expect, it, vi } from 'vitest';

import { createCatalogService } from './service';

describe('catalog service', () => {
  it('returns merchant category product counts from saved product records', async () => {
    const countProductsByCategory = vi.fn(async (categoryId: string) => {
      if (categoryId === 'cakes') {
        return 2;
      }

      if (categoryId === 'snacks') {
        return 0;
      }

      return 0;
    });
    const service = createCatalogService({
      listCategories: async () => [
        {
          id: 'cakes',
          name: '蛋糕',
          iconToken: '糕',
          sortOrder: 1,
          createdAt: '2026-05-16T00:00:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        },
        {
          id: 'snacks',
          name: '零食',
          iconToken: '零',
          sortOrder: 2,
          createdAt: '2026-05-16T00:00:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        }
      ],
      listProducts: async () => [],
      countProductsByCategory,
      upsertCategory: async (category) => ({
        id: category.id,
        name: category.name,
        iconToken: category.iconToken,
        sortOrder: category.sortOrder ?? 0,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z'
      }),
      deleteCategory: async () => undefined,
      deleteProduct: async () => undefined,
      upsertProduct: async (product) => product,
      listPublishedProducts: async () => [],
      getProductById: async () => null,
      decrementStock: async () => undefined
    });

    await expect(service.queryMerchantCategories()).resolves.toMatchObject({
      categories: [
        {
          id: 'cakes',
          linkedProductCount: 2,
          canDelete: false
        },
        {
          id: 'snacks',
          linkedProductCount: 0,
          canDelete: true
        }
      ]
    });
    expect(countProductsByCategory).toHaveBeenCalledTimes(2);
    expect(countProductsByCategory).toHaveBeenCalledWith('cakes');
    expect(countProductsByCategory).toHaveBeenCalledWith('snacks');
  });

  it('maps merchant catalog records into customer-facing category and product contracts', async () => {
    const service = createCatalogService({
      listCategories: async () => [
        {
          id: 'seasonal',
          name: '节日限定',
          iconToken: '节',
          sortOrder: 1,
          createdAt: '2026-05-16T00:00:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        }
      ],
      listProducts: async () => [
        {
          id: 'pumpkin-cake',
          name: '南瓜小蛋糕',
          description: '商户配置商品',
          categoryId: 'seasonal',
          imageFileId: '/assets/catalog/product-card-reference.png',
          imagePreviewUrl: '/assets/catalog/product-card-reference.png',
          memberLevelId: null,
          status: 'published',
          stock: 8,
          trackInventory: true,
          fulfillmentModes: ['delivery', 'pickup'],
          basePrice: 98,
          specs: [{ id: 'small', label: '小份', surcharge: 10 }],
          formulas: [],
          priceOverrides: [],
          purchaseLimit: { enabled: false, maxQuantity: null },
          detailContent: '适合节日加餐',
          createdAt: '2026-05-16T00:00:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        }
      ],
      countProductsByCategory: async () => 0,
      upsertCategory: async (category) => ({
        id: category.id,
        name: category.name,
        iconToken: category.iconToken,
        sortOrder: category.sortOrder ?? 0,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z'
      }),
      deleteCategory: async () => undefined,
      deleteProduct: async () => undefined,
      upsertProduct: async (product) => product,
      listPublishedProducts: async () => [],
      getProductById: async () => null,
      decrementStock: async () => undefined
    });

    await expect(service.queryCustomerCategories()).resolves.toMatchObject({
      categories: [
        {
          id: 'seasonal',
          name: '节日限定',
          shortName: '节日限定',
          iconText: '节',
          sectionTitle: '节日限定'
        }
      ]
    });
    await expect(service.queryCustomerProducts()).resolves.toMatchObject({
      products: [
        {
          id: 'pumpkin-cake',
          name: '南瓜小蛋糕',
          summary: '商户配置商品',
          description: '适合节日加餐',
          price: 98,
          stock: 8,
          soldOut: false,
          cartActionLabel: '选规格',
          memberLevelLabel: '普通会员可购',
          categoryId: 'seasonal',
          deliveryModes: ['delivery', 'pickup'],
          thumbnail: '/assets/catalog/product-card-reference.png',
          specs: [{ id: 'small', label: '小份', price: 108 }]
        }
      ]
    });
  });

  it('deletes merchant products by id', async () => {
    const deleteProduct = vi.fn(async () => undefined);
    const service = createCatalogService({
      listCategories: async () => [],
      listProducts: async () => [],
      countProductsByCategory: async () => 0,
      upsertCategory: async (category) => ({
        id: category.id,
        name: category.name,
        iconToken: category.iconToken,
        sortOrder: category.sortOrder ?? 0,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z'
      }),
      deleteCategory: async () => undefined,
      deleteProduct,
      upsertProduct: async (product) => product,
      listPublishedProducts: async () => [],
      getProductById: async () => null,
      decrementStock: async () => undefined
    });

    await expect(service.deleteMerchantProduct({ merchantId: 'm1' } as never, 'product-001')).resolves.toEqual({
      ok: true,
      deletedProductId: 'product-001'
    });
    expect(deleteProduct).toHaveBeenCalledWith('product-001');
  });
});
