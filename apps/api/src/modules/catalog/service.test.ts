import { describe, expect, it, vi } from 'vitest';

import { createCatalogService } from './service';

describe('catalog service', () => {
  function createCatalogRepositoryStub(overrides: Record<string, unknown> = {}) {
    return {
      listCategories: async () => [],
      listProducts: async () => [],
      countProductsByCategory: async () => 0,
      upsertCategory: async (category: { id: string; name: string; iconToken: string; sortOrder?: number }) => ({
        id: category.id,
        name: category.name,
        iconToken: category.iconToken,
        sortOrder: category.sortOrder ?? 0,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z'
      }),
      deleteCategory: async () => undefined,
      deleteProduct: async () => undefined,
      upsertProduct: async (product: unknown) => product,
      listPublishedProducts: async () => [],
      getProductById: async () => null,
      decrementStock: async () => undefined,
      ...overrides
    };
  }

  function createAsset(objectKey: string) {
    return {
      provider: 'oss',
      role: 'product-cover',
      bucket: 'xiaipet',
      region: 'oss-cn-hangzhou',
      objectKey,
      url: `https://assets.example.test/${objectKey}`,
      width: 480,
      height: 480,
      sizeBytes: 1000,
      contentType: 'image/jpeg',
      uploadedAt: '2026-05-19T00:00:00.000Z',
      variants: []
    };
  }

  function createProductPayload(overrides: Record<string, unknown> = {}) {
    return {
      basicInfo: {
        name: '南瓜小蛋糕',
        description: '商户配置商品',
        categoryId: 'seasonal',
        imageFileId: 'oss://xiaipet/products/product-001/cover-1.png',
        imageAsset: createAsset('products/product-001/cover-1.png'),
        imagePreviewUrl: 'https://assets.example.test/products/product-001/cover-1.png',
        introductionImageAssets: [createAsset('products/product-001/cover-1.png')],
        detailImageAssets: [],
        memberLevelId: null,
        stock: 8
      },
      pricing: {
        basePrice: 98,
        specs: [],
        formulas: [],
        overrides: [],
        purchaseLimit: { enabled: false, maxQuantity: null },
        detailContent: '适合节日加餐'
      },
      publishSettings: {
        status: 'published',
        trackInventory: true,
        fulfillmentModes: ['delivery']
      },
      ...overrides
    };
  }

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
          imageFileId: '',
          imagePreviewUrl: '',
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
          thumbnail: '',
          detailImages: [],
          specs: [{ id: 'small', label: '小份', price: 108 }]
        }
      ]
    });
  });

  it('returns customer category metadata with availability counts and snapshot keys', async () => {
    const service = createCatalogService(createCatalogRepositoryStub({
      listCustomerCatalogCategories: async () => [
        {
          id: 'cakes',
          name: '蛋糕',
          iconToken: '糕',
          sortOrder: 1,
          createdAt: '2026-05-16T00:00:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z',
          availableCount: 12,
          soldOutCount: 3,
          previewCount: 12,
          firstProductUpdatedAt: '2026-06-01T10:00:00.000Z'
        }
      ],
      createCustomerCategorySnapshotKey: async () => 'customer-categories-delivery-15-20260601'
    }) as never);

    await expect(service.queryCustomerCategories({ deliveryMode: 'delivery' })).resolves.toMatchObject({
      ok: true,
      snapshotKey: 'customer-categories-delivery-15-20260601',
      categories: [
        {
          id: 'cakes',
          name: '蛋糕',
          availableCount: 12,
          soldOutCount: 3,
          previewCount: 12,
          firstProductUpdatedAt: '2026-06-01T10:00:00.000Z'
        }
      ]
    });
  });

  it('returns customer category product summaries without heavy detail fields', async () => {
    const service = createCatalogService(createCatalogRepositoryStub({
      listCustomerCategoryProductSummaries: async () => ({
        items: [
          {
            id: 'cake-1',
            name: '南瓜蛋糕',
            description: '低糖',
            categoryId: 'cakes',
            imageFileId: '',
            imageAsset: undefined,
            imagePreviewUrl: 'https://assets.example/cake-thumb.jpg',
            memberLevelId: null,
            stock: 8,
            trackInventory: true,
            fulfillmentModes: ['delivery'],
            basePrice: 88,
            specs: [],
            formulas: [],
            priceOverrides: [],
            updatedAt: '2026-06-01T10:00:00.000Z'
          }
        ],
        nextCursor: null,
        hasMore: false
      }),
      createCustomerCategoryProductsSnapshotKey: async () => 'cakes-delivery-available-1'
    }) as never);

    const response = await service.queryCustomerCategoryProducts({
      categoryId: 'cakes',
      deliveryMode: 'delivery',
      availability: 'available',
      limit: 12
    });

    expect(response).toMatchObject({
      ok: true,
      categoryId: 'cakes',
      availability: 'available',
      pageInfo: { hasMore: false, nextCursor: null },
      snapshotKey: 'cakes-delivery-available-1',
      items: [
        expect.objectContaining({
          id: 'cake-1',
          thumbnail: 'https://assets.example/cake-thumb.jpg'
        })
      ]
    });
    expect(JSON.stringify(response.items[0])).not.toContain('detailImageAssets');
    expect(JSON.stringify(response.items[0])).not.toContain('detailContent');
    expect(JSON.stringify(response.items[0])).not.toContain('priceOverrides');
  });

  it('falls back to published category products for customer category summaries', async () => {
    const listProducts = vi.fn(async () => [
      {
        id: 'available-cake',
        name: '南瓜蛋糕',
        description: '低糖',
        categoryId: 'cakes',
        imageFileId: '',
        imageAsset: undefined,
        imagePreviewUrl: 'https://assets.example/available-cake.jpg',
        introductionImageAssets: [createAsset('products/available-cake/intro.jpg')],
        detailImageAssets: [createAsset('products/available-cake/detail.jpg')],
        memberLevelId: null,
        status: 'published',
        stock: 8,
        trackInventory: true,
        fulfillmentModes: ['delivery'],
        basePrice: 88,
        specs: [],
        formulas: [],
        priceOverrides: [{ specId: 'small', formulaId: 'plain', price: 88 }],
        purchaseLimit: { enabled: false, maxQuantity: null },
        detailContent: '详情长文',
        createdAt: '2026-06-01T10:00:00.000Z',
        updatedAt: '2026-06-01T10:00:00.000Z'
      },
      {
        id: 'second-cake',
        name: '红薯蛋糕',
        description: '软糯',
        categoryId: 'cakes',
        imageFileId: '',
        imageAsset: undefined,
        imagePreviewUrl: 'https://assets.example/second-cake.jpg',
        introductionImageAssets: [],
        detailImageAssets: [],
        memberLevelId: null,
        status: 'published',
        stock: 5,
        trackInventory: true,
        fulfillmentModes: ['delivery'],
        basePrice: 68,
        specs: [],
        formulas: [],
        priceOverrides: [],
        purchaseLimit: { enabled: false, maxQuantity: null },
        detailContent: '另一个详情长文',
        createdAt: '2026-06-01T11:00:00.000Z',
        updatedAt: '2026-06-01T11:00:00.000Z'
      },
      {
        id: 'sold-out-cake',
        name: '售罄蛋糕',
        description: '已售罄',
        categoryId: 'cakes',
        imageFileId: '',
        imageAsset: undefined,
        imagePreviewUrl: 'https://assets.example/sold-out-cake.jpg',
        introductionImageAssets: [],
        detailImageAssets: [],
        memberLevelId: null,
        status: 'published',
        stock: 0,
        trackInventory: true,
        fulfillmentModes: ['delivery'],
        basePrice: 58,
        specs: [],
        formulas: [],
        priceOverrides: [],
        purchaseLimit: { enabled: false, maxQuantity: null },
        detailContent: '售罄详情长文',
        createdAt: '2026-06-01T12:00:00.000Z',
        updatedAt: '2026-06-01T12:00:00.000Z'
      }
    ]);
    const service = createCatalogService(createCatalogRepositoryStub({ listProducts }) as never);

    const response = await service.queryCustomerCategoryProducts({
      categoryId: 'cakes',
      deliveryMode: 'delivery',
      availability: 'available',
      limit: 1
    });

    expect(listProducts).toHaveBeenCalledWith({ categoryId: 'cakes', status: 'published' });
    expect(response).toMatchObject({
      ok: true,
      categoryId: 'cakes',
      availability: 'available',
      pageInfo: { hasMore: true, nextCursor: '1' },
      snapshotKey: '',
      items: [
        {
          id: 'available-cake',
          thumbnail: 'https://assets.example/available-cake.jpg',
          soldOut: false
        }
      ]
    });
    expect(JSON.stringify(response.items[0])).not.toContain('detailImageAssets');
    expect(JSON.stringify(response.items[0])).not.toContain('detailContent');
    expect(JSON.stringify(response.items[0])).not.toContain('priceOverrides');
  });

  it('uses offset cursors when fallback customer category summaries have more pages', async () => {
    const createFallbackProduct = (id: string, name: string, stock = 5) => ({
      id,
      name,
      description: `${name} 简介`,
      categoryId: 'cakes',
      imageFileId: '',
      imageAsset: undefined,
      imagePreviewUrl: `https://assets.example/${id}.jpg`,
      introductionImageAssets: [],
      detailImageAssets: [],
      memberLevelId: null,
      status: 'published',
      stock,
      trackInventory: true,
      fulfillmentModes: ['delivery'],
      basePrice: 68,
      specs: [],
      formulas: [],
      priceOverrides: [],
      purchaseLimit: { enabled: false, maxQuantity: null },
      detailContent: `${name} 详情`,
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z'
    });
    const service = createCatalogService(createCatalogRepositoryStub({
      listProducts: async () => [
        createFallbackProduct('cake-1', '南瓜蛋糕'),
        createFallbackProduct('cake-2', '红薯蛋糕'),
        createFallbackProduct('cake-3', '山药蛋糕')
      ]
    }) as never);

    const firstPage = await service.queryCustomerCategoryProducts({
      categoryId: 'cakes',
      deliveryMode: 'delivery',
      availability: 'available',
      limit: 2
    });
    const secondPage = await service.queryCustomerCategoryProducts({
      categoryId: 'cakes',
      deliveryMode: 'delivery',
      availability: 'available',
      limit: 2,
      cursor: firstPage.pageInfo.nextCursor ?? undefined
    });

    expect(firstPage.items.map((item) => item.id)).toEqual(['cake-1', 'cake-2']);
    expect(firstPage.pageInfo).toEqual({ hasMore: true, nextCursor: '2' });
    expect(secondPage.items.map((item) => item.id)).toEqual(['cake-3']);
    expect(secondPage.pageInfo).toEqual({ hasMore: false, nextCursor: null });
  });

  it('normalizes protocol-less product image urls for merchant and customer responses', async () => {
    const service = createCatalogService(createCatalogRepositoryStub({
      listProducts: async () => [
        {
          id: 'protocol-less-cake',
          name: '无协议图片蛋糕',
          description: '商户配置商品',
          categoryId: 'seasonal',
          imageFileId: 'oss://xiaipet/products/protocol-less-cake/cover.png',
          imagePreviewUrl: 'xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/protocol-less-cake.png',
          imageAsset: {
            ...createAsset('products/protocol-less-cake/cover.png'),
            url: 'xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/cover.png',
            variants: [
              {
                name: 'thumbnail',
                objectKey: 'products/protocol-less-cake/thumb.png',
                url: 'xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/thumb.png'
              }
            ]
          },
          introductionImageAssets: [],
          detailImageAssets: [],
          memberLevelId: null,
          status: 'published',
          stock: 8,
          trackInventory: true,
          fulfillmentModes: ['delivery'],
          basePrice: 98,
          specs: [],
          formulas: [],
          priceOverrides: [],
          purchaseLimit: { enabled: false, maxQuantity: null },
          detailContent: '适合节日加餐',
          createdAt: '2026-05-16T00:00:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        }
      ]
    }) as never);

    await expect(service.queryMerchantProducts()).resolves.toMatchObject({
      products: [
        {
          imagePreviewUrl: 'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/protocol-less-cake.png',
          imageAsset: {
            url: 'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/cover.png',
            variants: [
              {
                url: 'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/thumb.png'
              }
            ]
          }
        }
      ]
    });

    await expect(service.queryCustomerProducts()).resolves.toMatchObject({
      products: [
        {
          thumbnail: 'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/thumb.png'
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

  it('accepts one to three merchant basic product images', async () => {
    const upsertProduct = vi.fn(async (product) => product);
    const service = createCatalogService(createCatalogRepositoryStub({ upsertProduct }) as never);
    const images = [
      createAsset('products/product-001/cover-1.png'),
      createAsset('products/product-001/cover-2.png'),
      createAsset('products/product-001/cover-3.png')
    ];

    await expect(
      service.upsertMerchantProduct(
        { merchantId: 'm1' } as never,
        'product-001',
        createProductPayload({
          basicInfo: {
            ...createProductPayload().basicInfo,
            introductionImageAssets: images
          }
        })
      )
    ).resolves.toMatchObject({
      product: {
        introductionImageAssets: images
      }
    });
    expect(upsertProduct).toHaveBeenCalledWith(expect.objectContaining({
      introductionImageAssets: images
    }));
  });

  it('rejects merchant products with more than three basic images', async () => {
    const service = createCatalogService(createCatalogRepositoryStub() as never);
    const images = [
      createAsset('products/product-001/cover-1.png'),
      createAsset('products/product-001/cover-2.png'),
      createAsset('products/product-001/cover-3.png'),
      createAsset('products/product-001/cover-4.png')
    ];

    await expect(
      service.upsertMerchantProduct(
        { merchantId: 'm1' } as never,
        'product-001',
        createProductPayload({
          basicInfo: {
            ...createProductPayload().basicInfo,
            introductionImageAssets: images
          }
        })
      )
    ).rejects.toMatchObject({
      code: 'INVALID_PRODUCT'
    });
  });

  it('rejects merchant products with more than nine detail long images', async () => {
    const service = createCatalogService(createCatalogRepositoryStub() as never);
    const detailImages = Array.from({ length: 10 }, (_, index) =>
      createAsset(`products/product-001/detail-${index + 1}.png`)
    );

    await expect(
      service.upsertMerchantProduct(
        { merchantId: 'm1' } as never,
        'product-001',
        createProductPayload({
          basicInfo: {
            ...createProductPayload().basicInfo,
            detailImageAssets: detailImages
          }
        })
      )
    ).rejects.toMatchObject({
      code: 'INVALID_PRODUCT'
    });
  });
});
