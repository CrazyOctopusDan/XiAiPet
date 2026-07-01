import { describe, expect, it } from 'vitest';

import type { CatalogProductAdminRecord } from '../types/catalog-admin';
import {
  resolveProductCombinationPrice,
  validateProductSavePricingContract
} from './product-pricing';

function createProduct(): CatalogProductAdminRecord {
  return {
    id: 'birthday-cake',
    name: '生日蛋糕',
    description: '适合生日庆祝',
    categoryId: 'cakes',
    imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake/cover.png',
    memberLevelId: 'vip',
    status: 'published',
    sortOrder: 1,
    stock: 8,
    trackInventory: true,
    fulfillmentModes: ['delivery', 'pickup'],
    basePrice: 198,
    specs: [
      {
        id: 'six-inch',
        label: '6 寸',
        surcharge: 0
      },
      {
        id: 'eight-inch',
        label: '8 寸',
        surcharge: 40
      }
    ],
    formulas: [
      {
        id: 'beef',
        label: '牛肉',
        surcharge: 12
      },
      {
        id: 'salmon',
        label: '三文鱼',
        surcharge: 20
      }
    ],
    priceOverrides: [
      {
        specId: 'eight-inch',
        formulaId: 'salmon',
        price: 268
      }
    ],
    purchaseLimit: {
      enabled: true,
      maxQuantity: 2
    },
    detailContent: '适合生日庆祝，可写祝福语。',
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z'
  };
}

describe('product pricing rules', () => {
  it('defaults combination price to base plus spec and formula surcharges', () => {
    expect(
      resolveProductCombinationPrice(createProduct(), {
        specId: 'six-inch',
        formulaId: 'beef'
      })
    ).toEqual({
      specId: 'six-inch',
      formulaId: 'beef',
      basePrice: 198,
      specSurcharge: 0,
      formulaSurcharge: 12,
      computedPrice: 210,
      finalPrice: 210,
      source: 'default'
    });
  });

  it('applies explicit overrides only to the targeted sparse exception rows', () => {
    const product = createProduct();

    expect(
      resolveProductCombinationPrice(product, {
        specId: 'eight-inch',
        formulaId: 'salmon'
      })
    ).toMatchObject({
      computedPrice: 258,
      finalPrice: 268,
      source: 'override'
    });

    expect(
      resolveProductCombinationPrice(product, {
        specId: 'eight-inch',
        formulaId: 'beef'
      })
    ).toMatchObject({
      computedPrice: 250,
      finalPrice: 250,
      source: 'default'
    });
  });

  it('rejects save paths that omit fulfillment, stock-aware publish metadata, or the image-backed base-info contract', () => {
    expect(
      validateProductSavePricingContract({
        ...createProduct(),
        imageFileId: '',
        fulfillmentModes: [],
        trackInventory: undefined
      })
    ).toEqual({
      valid: false,
      issues: ['imageFileId', 'fulfillmentModes', 'trackInventory']
    });

    expect(validateProductSavePricingContract(createProduct())).toEqual({
      valid: true,
      issues: []
    });
  });
});
