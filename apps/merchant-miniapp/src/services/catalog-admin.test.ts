import { describe, expect, it, vi } from 'vitest';

import type {
  CatalogCategoryRecord,
  CatalogProductAdminRecord,
  CatalogProductEditorPayload
} from '@xiaipet/shared/types/catalog-admin';

import {
  createEmptyProductEditorPayload,
  getCategoryPageViewModel,
  getProductEditorViewModel,
  queryCategories,
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
    const callFunction = vi.fn().mockResolvedValue({
      result: {
        ok: true,
        categories: [
          {
            ...createCategory(),
            linkedProductCount: 3,
            canDelete: false
          }
        ]
      }
    });

    const categories = await queryCategories(callFunction);
    const view = getCategoryPageViewModel(categories);

    expect(callFunction).toHaveBeenCalledWith({
      name: 'queryCategories',
      data: {}
    });
    expect(view.cards[0]).toMatchObject({
      iconToken: '🎂',
      linkedProductCountLabel: '3 个商品',
      deleteActionLabel: '先迁移商品'
    });
  });

  it('builds a three-step editor model with price summary, override badge, and step CTAs', () => {
    const view = getProductEditorViewModel(createProductPayload(), 'pricing');

    expect(view.steps.map((item) => item.label)).toEqual(['基础信息', '规格配方与价格', '上架设置']);
    expect(view.ctaLabel).toBe('保存规格配方并继续');
    expect(view.purchaseLimitLabel).toBe('限购 2 件');
    expect(view.detailContentLabel).toBe('详情内容已填写');
    expect(view.pricePreviewRows).toContainEqual(
      expect.objectContaining({
        label: '6 寸 × 羊奶配方',
        finalPriceLabel: '￥166.00',
        overrideLabel: '已覆盖自动计算'
      })
    );
  });

  it('uploads a product image and preserves the returned imageFileId in product save calls', async () => {
    const uploader = vi.fn().mockResolvedValue({
      fileID: 'cloud://xiaipet-dev.123/products/product-001/1713412800-cover.png'
    });
    const callFunction = vi.fn().mockResolvedValue({
      result: {
        ok: true,
        product: createProductRecord()
      }
    });

    const fileID = await uploadProductImage('/tmp/cover.png', 'product-001', uploader);
    const payload = createProductPayload({
      basicInfo: {
        ...createProductPayload().basicInfo,
        imageFileId: fileID,
        imagePreviewUrl: fileID
      }
    });

    await saveProduct(payload, callFunction);

    expect(fileID).toContain('imageFileId'.replace('imageFileId', 'cloud://'));
    expect(uploader).toHaveBeenCalledWith({
      cloudPath: expect.stringContaining('product-001'),
      filePath: '/tmp/cover.png'
    });
    expect(callFunction).toHaveBeenCalledWith({
      name: 'upsertProduct',
      data: {
        payload
      }
    });
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
