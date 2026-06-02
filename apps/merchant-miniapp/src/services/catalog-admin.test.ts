import { describe, expect, it, vi } from 'vitest';

import type {
  CatalogCategoryRecord,
  CatalogProductAdminRecord,
  CatalogProductEditorPayload
} from '@xiaipet/shared/types/catalog-admin';
import type { MerchantApiRequester } from './api-client';

import {
  applyProductCountsToCategories,
  createEmptyProductEditorPayload,
  deleteCategory,
  deleteProduct,
  getCategoryPageViewModel,
  getProductPageViewModel,
  getProductEditorViewModel,
  queryCategories,
  queryProducts,
  saveCategory,
  saveProduct,
  uploadProductImage
} from './catalog-admin';

function createCategory(overrides: Partial<CatalogCategoryRecord> = {}): CatalogCategoryRecord {
  return {
    id: 'cakes',
    name: '生日蛋糕',
    iconToken: '🎂',
    createdAt: '2026-04-18T10:00:00.000Z',
    updatedAt: '2026-04-18T10:00:00.000Z',
    ...overrides
  };
}

function createProductRecord(overrides: Partial<CatalogProductAdminRecord> = {}): CatalogProductAdminRecord {
  return {
    id: 'product-001',
    name: '海洋派对蛋糕',
    description: '适合生日庆祝',
    categoryId: 'cakes',
    imageFileId: 'cloud://xiaipet-dev.123/products/product-001/cover.png',
    imagePreviewUrl: 'cloud://xiaipet-dev.123/products/product-001/cover.png',
    memberLevelId: null,
    status: 'published',
    stock: 8,
    trackInventory: true,
    fulfillmentModes: ['delivery', 'pickup'],
    basePrice: 128,
    specs: [
      { id: 'spec-4', label: '4 寸', surcharge: 0 },
      { id: 'spec-6', label: '6 寸', surcharge: 20 }
    ],
    formulas: [
      { id: 'formula-yogurt', label: '酸奶配方', surcharge: 0 },
      { id: 'formula-goat', label: '羊奶配方', surcharge: 12 }
    ],
    priceOverrides: [{ specId: 'spec-6', formulaId: 'formula-goat', price: 166 }],
    purchaseLimit: {
      enabled: true,
      maxQuantity: 2
    },
    detailContent: '建议提前一天预约',
    createdAt: '2026-04-18T10:00:00.000Z',
    updatedAt: '2026-04-18T10:00:00.000Z',
    ...overrides
  };
}

function createProductPayload(overrides: Partial<CatalogProductEditorPayload> = {}): CatalogProductEditorPayload {
  const product = createProductRecord();

  return {
    basicInfo: {
      productId: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      imageFileId: product.imageFileId,
      imagePreviewUrl: product.imagePreviewUrl,
      memberLevelId: product.memberLevelId,
      stock: product.stock
    },
    pricing: {
      basePrice: product.basePrice,
      specs: product.specs,
      formulas: product.formulas,
      overrides: product.priceOverrides,
      purchaseLimit: product.purchaseLimit,
      detailContent: product.detailContent
    },
    publishSettings: {
      status: product.status,
      fulfillmentModes: product.fulfillmentModes,
      trackInventory: product.trackInventory
    },
    ...overrides
  };
}

describe('catalog admin service', () => {
  it('queries categories and exposes icon tokens plus migrate-before-delete copy', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      categories: [
        {
          ...createCategory(),
          linkedProductCount: 3,
          canDelete: false
        }
      ]
    });

    const categories = await queryCategories(request);
    const view = getCategoryPageViewModel(categories);

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/categories', {
      method: 'GET',
      auth: 'merchant'
    });
    expect(view.cards[0]).toMatchObject({
      iconToken: '🎂',
      linkedProductCountLabel: '3 个商品',
      deleteActionLabel: '先迁移商品'
    });
    expect(view.summary).toEqual({
      totalCategories: 1,
      linkedProducts: 3,
      lockedCategories: 1
    });
  });

  it('recomputes category counts from actual products when category responses are stale', () => {
    const categories = applyProductCountsToCategories(
      [
        {
          ...createCategory({ id: 'cakes', name: '宠物蛋糕' }),
          linkedProductCount: 0,
          canDelete: true
        },
        {
          ...createCategory({ id: 'snacks', name: '零食', iconToken: '零' }),
          linkedProductCount: 9,
          canDelete: false
        }
      ],
      [
        createProductRecord({ id: 'cake-1', categoryId: 'cakes' }),
        createProductRecord({ id: 'cake-2', categoryId: 'cakes' })
      ]
    );
    const view = getCategoryPageViewModel(categories);

    expect(view.cards).toEqual([
      expect.objectContaining({
        id: 'cakes',
        linkedProductCountLabel: '2 个商品',
        deleteActionLabel: '先迁移商品'
      }),
      expect.objectContaining({
        id: 'snacks',
        linkedProductCountLabel: '0 个商品',
        deleteActionLabel: '删除品类'
      })
    ]);
    expect(view.summary).toMatchObject({
      linkedProducts: 2,
      lockedCategories: 1
    });
  });

  it('saves and deletes categories through merchant HTTP endpoints', async () => {
    const category = createCategory();
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        category
      })
      .mockResolvedValueOnce({
        ok: true
      });

    await expect(saveCategory(category, request)).resolves.toEqual(category);
    await expect(deleteCategory(category.id, request)).resolves.toBe(category.id);

    expect(request).toHaveBeenNthCalledWith(1, '/api/v1/merchant/categories/cakes', {
      method: 'PUT',
      body: category,
      auth: 'merchant'
    });
    expect(request).toHaveBeenNthCalledWith(2, '/api/v1/merchant/categories/cakes', {
      method: 'DELETE',
      auth: 'merchant'
    });
  });

  it('builds a three-step editor model with price summary, override badge, and step CTAs', () => {
    const view = getProductEditorViewModel(createProductPayload(), 'pricing');

    expect(view.steps.map((item) => item.label)).toEqual(['基础信息', '规格配方与价格', '上架设置']);
    expect(view.activeStepLabel).toBe('规格配方与价格');
    expect(view.ctaLabel).toBe('保存规格配方并继续');
    expect(view.previousStepLabel).toBe('返回基础信息');
    expect(view.purchaseLimitLabel).toBe('限购 2 件');
    expect(view.detailContentLabel).toBe('详情内容已填写');
    expect(view.fulfillmentModeOptions).toEqual([
      { value: 'delivery', label: '配送', isActive: true },
      { value: 'pickup', label: '自取', isActive: true },
      { value: 'express', label: '快递', isActive: false }
    ]);
    expect(view.pricePreviewRows).toContainEqual(
      expect.objectContaining({
        label: '6 寸 × 羊奶配方',
        finalPriceLabel: '￥166.00',
        overrideLabel: '已覆盖自动计算'
      })
    );
  });

  it('does not expose a previous-step CTA on the first editor step', () => {
    const view = getProductEditorViewModel(createProductPayload(), 'basicInfo');

    expect(view.previousStepLabel).toBeNull();
  });

  it('builds basic image tiles from one to three introduction images', () => {
    const view = getProductEditorViewModel(
      createProductPayload({
        basicInfo: {
          ...createProductPayload().basicInfo,
          imageFileId: 'oss://xiaipet/products/product-001/cover-1.png',
          imagePreviewUrl: 'https://oss.example.com/products/product-001/cover-1.png',
          introductionImageAssets: [
            {
              provider: 'oss',
              role: 'product-cover',
              bucket: 'xiaipet',
              region: 'oss-cn-hangzhou',
              objectKey: 'products/product-001/cover-1.png',
              url: 'https://oss.example.com/products/product-001/cover-1.png',
              width: 480,
              height: 480,
              sizeBytes: 1000,
              contentType: 'image/jpeg',
              uploadedAt: '2026-05-19T00:00:00.000Z',
              variants: []
            },
            {
              provider: 'oss',
              role: 'product-cover',
              bucket: 'xiaipet',
              region: 'oss-cn-hangzhou',
              objectKey: 'products/product-001/cover-2.png',
              url: 'https://oss.example.com/products/product-001/cover-2.png',
              width: 480,
              height: 480,
              sizeBytes: 1000,
              contentType: 'image/jpeg',
              uploadedAt: '2026-05-19T00:01:00.000Z',
              variants: []
            }
          ]
        }
      }),
      'basicInfo'
    );

    expect(view.basicImageCountLabel).toBe('2 / 3');
    expect(view.canAddBasicImage).toBe(true);
    expect(view.basicImageTiles).toEqual([
      {
        index: 0,
        imageSrc: 'https://oss.example.com/products/product-001/cover-1.png',
        isCover: true
      },
      {
        index: 1,
        imageSrc: 'https://oss.example.com/products/product-001/cover-2.png',
        isCover: false
      }
    ]);
  });

  it('adds https before rendering protocol-less merchant product images', () => {
    const view = getProductPageViewModel(
      [
        createProductRecord({
          imagePreviewUrl: 'xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/prod-birthday-cake.png'
        })
      ],
      [{ ...createCategory(), linkedProductCount: 1, canDelete: false }],
      '',
      ''
    );

    expect(view.cards[0]?.imagePreviewUrl).toBe('https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/prod-birthday-cake.png');

    const editorView = getProductEditorViewModel(
      createProductPayload({
        basicInfo: {
          ...createProductPayload().basicInfo,
          imagePreviewUrl: 'xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/display.jpg',
          introductionImageAssets: []
        }
      }),
      'basicInfo'
    );

    expect(editorView.basicImageTiles[0]?.imageSrc).toBe(
      'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/display.jpg'
    );
  });

  it('falls back to the legacy single cover while editing old products', () => {
    const view = getProductEditorViewModel(
      createProductPayload({
        basicInfo: {
          ...createProductPayload().basicInfo,
          imageFileId: 'oss://xiaipet/products/product-001/legacy-cover.png',
          imagePreviewUrl: 'https://oss.example.com/products/product-001/legacy-cover.png',
          introductionImageAssets: []
        }
      }),
      'basicInfo'
    );

    expect(view.basicImageCountLabel).toBe('1 / 3');
    expect(view.basicImageTiles).toEqual([
      {
        index: 0,
        imageSrc: 'https://oss.example.com/products/product-001/legacy-cover.png',
        isCover: true
      }
    ]);
  });

  it('builds optional detail long-image tiles up to nine images', () => {
    const detailImageAssets = Array.from({ length: 9 }, (_, index) => ({
      provider: 'oss' as const,
      role: 'product-detail' as const,
      bucket: 'xiaipet',
      region: 'oss-cn-hangzhou',
      objectKey: `products/product-001/detail-${index + 1}.png`,
      url: `https://oss.example.com/products/product-001/detail-${index + 1}.png`,
      width: 960,
      height: 1280,
      sizeBytes: 1000,
      contentType: 'image/jpeg',
      uploadedAt: '2026-05-19T00:00:00.000Z',
      variants: []
    }));
    const view = getProductEditorViewModel(
      createProductPayload({
        basicInfo: {
          ...createProductPayload().basicInfo,
          detailImageAssets
        }
      }),
      'pricing'
    );

    expect(view.detailImageCountLabel).toBe('9 / 9');
    expect(view.canAddDetailImage).toBe(false);
    expect(view.detailImageTiles).toHaveLength(9);
    expect(view.detailImageTiles[0]).toEqual({
      index: 0,
      imageSrc: 'https://oss.example.com/products/product-001/detail-1.png'
    });
  });

  it('queries products and preserves the imageFileId in product save calls', async () => {
    const product = createProductRecord();
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        items: [product],
        summary: {
          totalProducts: 1,
          publishedProducts: 1,
          draftProducts: 0,
          archivedProducts: 0,
          stockWarnings: 0
        },
        pageInfo: { hasMore: false, nextCursor: null },
        snapshotKey: 'merchant-products-1'
      })
      .mockResolvedValueOnce({
        ok: true,
        product
      });
    const payload = createProductPayload({
      basicInfo: {
        ...createProductPayload().basicInfo,
        imageFileId: 'oss://xiaipet/products/product-001/cover.png',
        imagePreviewUrl: 'https://oss.example.com/products/product-001/cover.png'
      }
    });

    await expect(queryProducts({ categoryId: 'cakes' }, request)).resolves.toMatchObject({
      items: [product],
      summary: { totalProducts: 1 },
      pageInfo: { hasMore: false, nextCursor: null },
      snapshotKey: 'merchant-products-1'
    });
    await saveProduct(payload, request);
    await expect(deleteProduct(product.id, request)).resolves.toBe(product.id);

    expect(request).toHaveBeenNthCalledWith(1, '/api/v1/merchant/products', {
      method: 'GET',
      query: {
        categoryId: 'cakes'
      },
      auth: 'merchant'
    });
    expect(request).toHaveBeenNthCalledWith(2, '/api/v1/merchant/products/product-001', {
      method: 'PUT',
      body: payload,
      auth: 'merchant'
    });
    expect(request).toHaveBeenNthCalledWith(3, '/api/v1/merchant/products/product-001', {
      method: 'DELETE',
      auth: 'merchant'
    });
  });

  it('queries merchant product summaries with filters and backend summary', async () => {
    const product = createProductRecord({ id: 'cake-1' });
    const request = vi.fn().mockResolvedValue({
      ok: true,
      items: [product],
      summary: {
        totalProducts: 30,
        publishedProducts: 20,
        draftProducts: 8,
        archivedProducts: 2,
        stockWarnings: 3
      },
      pageInfo: { hasMore: true, nextCursor: 'cursor-2' },
      snapshotKey: 'merchant-products-30'
    });

    const result = await queryProducts(
      { categoryId: 'cakes', status: 'published', keyword: '南瓜', sort: 'latest', limit: 20 },
      request
    );

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/products', {
      method: 'GET',
      query: { categoryId: 'cakes', status: 'published', keyword: '南瓜', sort: 'latest', limit: 20 },
      auth: 'merchant'
    });
    expect(result.summary.totalProducts).toBe(30);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.items[0]?.id).toBe('cake-1');
  });

  it('summarizes filtered products for the merchant product list header', () => {
    const view = getProductPageViewModel(
      [
        createProductRecord({
          id: 'published-001',
          status: 'published',
          stock: 8,
          trackInventory: true
        }),
        createProductRecord({
          id: 'draft-001',
          name: '低库存蛋糕',
          status: 'draft',
          stock: 0,
          trackInventory: true
        }),
        createProductRecord({
          id: 'archived-001',
          categoryId: 'snacks',
          status: 'archived',
          trackInventory: false
        })
      ],
      [
        {
          ...createCategory(),
          linkedProductCount: 2,
          canDelete: false
        },
        {
          ...createCategory({ id: 'snacks', name: '零食', iconToken: '零' }),
          linkedProductCount: 1,
          canDelete: false
        }
      ],
      'cakes',
      ''
    );

    expect(view.summary).toEqual({
      totalProducts: 2,
      publishedProducts: 1,
      stockWarnings: 1
    });
  });

  it('uploads product cover images through the OSS asset flow', async () => {
    (globalThis as any).wx = {
      compressImage: vi.fn((options) => options.success({ tempFilePath: options.src })),
      cropImage: vi.fn((options) => options.success({ tempFilePath: options.src })),
      getFileInfo: vi.fn((options) => options.success({ size: 1000 })),
      getImageInfo: vi.fn((options) => options.success({ width: 480, height: 480 })),
      uploadFile: vi.fn((options) => options.success({ statusCode: 200 }))
    };
    const request = vi.fn((path: string, options: any) => {
      if (path.endsWith('/upload-policies')) {
        return Promise.resolve({
          upload: {
            method: 'POST',
            url: 'https://oss.example.test',
            fileFieldName: 'file',
            formData: { key: options.body.variantName },
            objectKey: `key-${options.body.variantName}`,
            expiresAt: '2026-05-11T00:15:00.000Z',
            confirmToken: `token-${options.body.variantName}`
          }
        });
      }

      return Promise.resolve({
        storageId: `oss://bucket/${options.body.objectKey}`,
        asset: {
          provider: 'oss',
          role: 'product-cover',
          bucket: 'bucket',
          region: 'oss-cn-shanghai',
          objectKey: options.body.objectKey,
          url: `https://assets.example.test/${options.body.objectKey}`,
          width: 480,
          height: 480,
          sizeBytes: 1000,
          contentType: 'image/jpeg',
          uploadedAt: '2026-05-11T00:00:00.000Z',
          variants: [
            {
              name: options.body.variantName,
              objectKey: options.body.objectKey,
              url: `https://assets.example.test/${options.body.objectKey}`,
              width: 480,
              height: 480,
              sizeBytes: 1000,
              contentType: 'image/jpeg'
            }
          ]
        }
      });
    }) as unknown as MerchantApiRequester;

    await expect(uploadProductImage('/tmp/cover.png', 'product-001', request)).resolves.toBe(
      'oss://bucket/key-display'
    );
    delete (globalThis as any).wx;
  });

  it('creates a draft product payload with the fixed phase step structure', () => {
    const draft = createEmptyProductEditorPayload('cakes');

    expect(draft.basicInfo.categoryId).toBe('cakes');
    expect(draft.basicInfo.imageFileId).toBe('');
    expect(draft.pricing.purchaseLimit).toEqual({
      enabled: false,
      maxQuantity: null
    });
    expect(draft.publishSettings.status).toBe('draft');
  });
});
