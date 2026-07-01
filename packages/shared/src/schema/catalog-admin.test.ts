import { describe, expect, it } from 'vitest';

import type {
  CatalogCategoryDeletePreflight,
  CatalogCategoryRecord,
  CatalogProductAdminRecord,
  CatalogProductEditorPayload
} from '../types/catalog-admin';
import {
  isCatalogCategoryDeletePreflight,
  isCatalogCategoryRecord,
  isCatalogProductAdminRecord,
  isCatalogProductEditorPayload
} from './catalog-admin';

describe('catalog admin schema', () => {
  function createAsset(objectKey: string) {
    return {
      provider: 'oss' as const,
      role: 'product-cover' as const,
      bucket: 'xiaipet',
      region: 'oss-cn-hangzhou',
      objectKey,
      url: `https://assets.example.test/${objectKey}`,
      width: 480,
      height: 480,
      sizeBytes: 1000,
      contentType: 'image/jpeg',
      uploadedAt: '2026-05-19T00:00:00.000Z',
      variants: [
        {
          name: 'display' as const,
          objectKey,
          url: `https://assets.example.test/${objectKey}`,
          width: 480,
          height: 480,
          sizeBytes: 1000,
          contentType: 'image/jpeg'
        }
      ]
    };
  }

  it('requires category records to include both name and iconToken', () => {
    const category: CatalogCategoryRecord = {
      id: 'cakes',
      name: '生日蛋糕',
      iconToken: '🎂',
      sortOrder: 10,
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z'
    };

    expect(isCatalogCategoryRecord(category)).toBe(true);
    expect(
      isCatalogCategoryRecord({
        id: 'cakes',
        name: '生日蛋糕',
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z'
      })
    ).toBe(false);
    expect(
      isCatalogCategoryRecord({
        ...category,
        iconToken: '生日蛋糕图标'
      })
    ).toBe(false);
    expect(
      isCatalogCategoryRecord({
        ...category,
        sortOrder: -1
      })
    ).toBe(false);
  });

  it('accepts the three-step product editor payload with a single categoryId', () => {
    const payload: CatalogProductEditorPayload = {
      basicInfo: {
        productId: 'birthday-cake',
        name: '生日蛋糕',
        description: '适合生日聚会',
        categoryId: 'cakes',
        imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake/cover.png',
        imagePreviewUrl: 'https://example.com/temp-preview.png',
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
        detailContent: '适合生日庆祝，可写祝福语。'
      },
      publishSettings: {
        status: 'draft',
        fulfillmentModes: ['delivery', 'pickup'],
        trackInventory: true
      }
    };

    expect(isCatalogProductEditorPayload(payload)).toBe(true);
    expect(
      isCatalogProductEditorPayload({
        ...payload,
        basicInfo: {
          ...payload.basicInfo,
          categoryId: ['cakes']
        }
      })
    ).toBe(false);
  });

  it('requires a CloudBase imageFileId and rejects temp urls or local paths as the persisted source of truth', () => {
    const product: CatalogProductAdminRecord = {
      id: 'birthday-cake',
      name: '生日蛋糕',
      description: '适合生日聚会',
      categoryId: 'cakes',
      imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake/cover.png',
      imagePreviewUrl: 'https://example.com/temp-preview.png',
      memberLevelId: 'vip',
      status: 'draft',
      stock: 12,
      trackInventory: true,
      fulfillmentModes: ['delivery', 'pickup'],
      basePrice: 198,
      specs: [],
      formulas: [],
      priceOverrides: [],
      purchaseLimit: {
        enabled: true,
        maxQuantity: 2
      },
      detailContent: '适合生日庆祝，可写祝福语。',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z'
    };

    expect(isCatalogProductAdminRecord(product)).toBe(true);
    expect(
      isCatalogProductAdminRecord({
        ...product,
        imageFileId: 'https://example.com/temp-preview.png'
      })
    ).toBe(false);
    expect(
      isCatalogProductAdminRecord({
        ...product,
        imageFileId: 'wxfile://tmp_12345'
      })
    ).toBe(false);
  });

  it('requires explicit purchaseLimit and detailContent fields', () => {
    const product: CatalogProductAdminRecord = {
      id: 'birthday-cake',
      name: '生日蛋糕',
      description: '适合生日聚会',
      categoryId: 'cakes',
      imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake/cover.png',
      memberLevelId: 'vip',
      status: 'published',
      stock: 12,
      trackInventory: true,
      fulfillmentModes: ['delivery'],
      basePrice: 198,
      specs: [],
      formulas: [],
      priceOverrides: [],
      purchaseLimit: {
        enabled: false,
        maxQuantity: null
      },
      detailContent: '适合生日庆祝，可写祝福语。',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z'
    };

    expect(isCatalogProductAdminRecord(product)).toBe(true);
    expect(
      isCatalogProductAdminRecord({
        ...product,
        purchaseLimit: undefined
      })
    ).toBe(false);
    expect(
      isCatalogProductAdminRecord({
        ...product,
        detailContent: ''
      })
    ).toBe(false);
  });

  it('limits product editor basic images to three uploaded assets', () => {
    const payload: CatalogProductEditorPayload = {
      basicInfo: {
        productId: 'birthday-cake',
        name: '生日蛋糕',
        description: '适合生日聚会',
        categoryId: 'cakes',
        imageFileId: 'oss://xiaipet/products/birthday-cake/cover-1.png',
        imageAsset: createAsset('products/birthday-cake/cover-1.png'),
        imagePreviewUrl: 'https://assets.example.test/products/birthday-cake/cover-1.png',
        introductionImageAssets: [
          createAsset('products/birthday-cake/cover-1.png'),
          createAsset('products/birthday-cake/cover-2.png'),
          createAsset('products/birthday-cake/cover-3.png')
        ],
        memberLevelId: 'vip',
        stock: 12
      },
      pricing: {
        basePrice: 198,
        specs: [],
        formulas: [],
        overrides: [],
        purchaseLimit: {
          enabled: false,
          maxQuantity: null
        },
        detailContent: '适合生日庆祝，可写祝福语。'
      },
      publishSettings: {
        status: 'draft',
        fulfillmentModes: ['delivery', 'pickup'],
        trackInventory: true
      }
    };

    expect(isCatalogProductEditorPayload(payload)).toBe(true);
    expect(
      isCatalogProductEditorPayload({
        ...payload,
        basicInfo: {
          ...payload.basicInfo,
          introductionImageAssets: [
            ...payload.basicInfo.introductionImageAssets!,
            createAsset('products/birthday-cake/cover-4.png')
          ]
        }
      })
    ).toBe(false);
  });

  it('limits product editor detail long images to nine uploaded assets', () => {
    const payload: CatalogProductEditorPayload = {
      basicInfo: {
        productId: 'birthday-cake',
        name: '生日蛋糕',
        description: '适合生日聚会',
        categoryId: 'cakes',
        imageFileId: 'oss://xiaipet/products/birthday-cake/cover-1.png',
        imageAsset: createAsset('products/birthday-cake/cover-1.png'),
        imagePreviewUrl: 'https://assets.example.test/products/birthday-cake/cover-1.png',
        detailImageAssets: Array.from({ length: 9 }, (_, index) =>
          createAsset(`products/birthday-cake/detail-${index + 1}.png`)
        ),
        memberLevelId: 'vip',
        stock: 12
      },
      pricing: {
        basePrice: 198,
        specs: [],
        formulas: [],
        overrides: [],
        purchaseLimit: {
          enabled: false,
          maxQuantity: null
        },
        detailContent: '适合生日庆祝，可写祝福语。'
      },
      publishSettings: {
        status: 'draft',
        fulfillmentModes: ['delivery', 'pickup'],
        trackInventory: true
      }
    };

    expect(isCatalogProductEditorPayload(payload)).toBe(true);
    expect(
      isCatalogProductEditorPayload({
        ...payload,
        basicInfo: {
          ...payload.basicInfo,
          detailImageAssets: [
            ...payload.basicInfo.detailImageAssets!,
            createAsset('products/birthday-cake/detail-10.png')
          ]
        }
      })
    ).toBe(false);
  });

  it('exposes linked product counts in the category delete preflight shape', () => {
    const preflight: CatalogCategoryDeletePreflight = {
      categoryId: 'cakes',
      linkedProductCount: 3,
      canDelete: false
    };

    expect(isCatalogCategoryDeletePreflight(preflight)).toBe(true);
    expect(
      isCatalogCategoryDeletePreflight({
        categoryId: 'cakes',
        canDelete: false
      })
    ).toBe(false);
  });
});
