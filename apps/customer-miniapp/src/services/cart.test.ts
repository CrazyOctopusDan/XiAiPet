import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProductById } from './catalog';
import type { CatalogProduct } from '../types/catalog';
import {
  addCartItem,
  CUSTOMER_CART_STORAGE_KEY,
  clearCart,
  getCartItemGroups,
  getCartCount,
  getCartItems,
  getCartProductQuantity,
  getCartProductTotalQuantity,
  getCartSummary,
  getSelectedCartFulfillmentModes,
  hasUnverifiedCartItems,
  hydrateCartFromStorage,
  reconcileCartWithCatalog,
  removeCartItem,
  toggleAllCartItems,
  updateCartItemSpec,
  updateCartItemQuantity,
  updateCartProductQuantity,
  updateCartItemSelection
} from './cart';

function createFulfillmentProduct(id: string, deliveryModes: CatalogProduct['deliveryModes']): CatalogProduct {
  return {
    id,
    name: id,
    summary: '测试商品',
    description: '测试商品',
    price: 10,
    stock: 10,
    soldOut: false,
    cartActionLabel: '直接加购',
    memberLevelLabel: '普通会员',
    categoryId: 'test',
    deliveryModes,
    thumbnail: '',
    gallery: [],
    detailImages: [],
    specs: []
  };
}

describe('cart service', () => {
  let storage: Map<string, unknown>;

  beforeEach(() => {
    storage = new Map<string, unknown>();
    vi.stubGlobal('wx', {
      getStorageSync: vi.fn((key: string) => storage.get(key)),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
      removeStorageSync: vi.fn((key: string) => storage.delete(key))
    });
    clearCart();
  });

  it('merges the same product and spec into one cart row', () => {
    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 1);
    addCartItem(product, product.specs[0]?.id ?? '', 2);

    expect(getCartItems()).toHaveLength(1);
    expect(getCartItems()[0]?.quantity).toBe(3);
    expect(getCartCount()).toBe(3);
    expect(storage.get(CUSTOMER_CART_STORAGE_KEY)).toMatchObject({
      schemaVersion: 1,
      items: [
        expect.objectContaining({
          productId: product.id,
          specId: product.specs[0]?.id ?? '',
          quantity: 3,
          selected: true,
          snapshot: expect.objectContaining({
            name: product.name,
            specLabel: product.specs[0]?.label ?? '',
            unitPrice: product.specs[0]?.price ?? product.price
          })
        })
      ]
    });
  });

  it('hydrates a persisted cart snapshot as unverified same-device state', () => {
    storage.set(CUSTOMER_CART_STORAGE_KEY, {
      schemaVersion: 1,
      updatedAt: '2026-06-24T00:00:00.000Z',
      items: [
        {
          productId: 'ocean-party',
          specId: 'ocean-party-4-chicken',
          quantity: 2,
          selected: true,
          snapshot: {
            name: '海洋奇遇',
            summary: '旧简介',
            thumbnail: 'https://assets.example.test/ocean.jpg',
            specLabel: '4寸 鸡肉',
            unitPrice: 168,
            stock: 5,
            deliveryModes: ['delivery', 'pickup']
          },
          updatedAt: '2026-06-24T00:00:00.000Z'
        }
      ]
    });

    hydrateCartFromStorage({ now: Date.parse('2026-06-25T00:00:00.000Z') });

    expect(getCartItems()).toEqual([
      expect.objectContaining({
        productId: 'ocean-party',
        specId: 'ocean-party-4-chicken',
        name: '海洋奇遇',
        specLabel: '4寸 鸡肉',
        quantity: 2,
        selected: true,
        validationStatus: 'unverified'
      })
    ]);
    expect(hasUnverifiedCartItems()).toBe(true);
    expect(getCartCount()).toBe(2);
  });

  it('clears unsupported or expired persisted carts', () => {
    storage.set(CUSTOMER_CART_STORAGE_KEY, {
      schemaVersion: 99,
      updatedAt: '2026-06-24T00:00:00.000Z',
      items: []
    });
    hydrateCartFromStorage({ now: Date.parse('2026-06-25T00:00:00.000Z') });
    expect(getCartItems()).toEqual([]);
    expect(storage.has(CUSTOMER_CART_STORAGE_KEY)).toBe(false);

    storage.set(CUSTOMER_CART_STORAGE_KEY, {
      schemaVersion: 1,
      updatedAt: '2026-05-01T00:00:00.000Z',
      items: [
        {
          productId: 'sea-sponge',
          specId: '',
          quantity: 1,
          selected: true,
          snapshot: {
            name: '海绵宝宝',
            summary: '',
            thumbnail: '',
            specLabel: '',
            unitPrice: 36,
            stock: 3,
            deliveryModes: ['delivery']
          },
          updatedAt: '2026-05-01T00:00:00.000Z'
        }
      ]
    });

    hydrateCartFromStorage({ now: Date.parse('2026-06-24T00:00:00.000Z') });

    expect(getCartItems()).toEqual([]);
    expect(storage.has(CUSTOMER_CART_STORAGE_KEY)).toBe(false);
  });

  it('reconciles persisted cart rows with current product facts', async () => {
    storage.set(CUSTOMER_CART_STORAGE_KEY, {
      schemaVersion: 1,
      updatedAt: '2026-06-24T00:00:00.000Z',
      items: [
        {
          productId: 'ocean-party',
          specId: 'ocean-party-4-chicken',
          quantity: 5,
          selected: true,
          snapshot: {
            name: '旧名称',
            summary: '旧简介',
            thumbnail: 'old.jpg',
            specLabel: '旧规格',
            unitPrice: 168,
            stock: 8,
            deliveryModes: ['delivery']
          },
          updatedAt: '2026-06-24T00:00:00.000Z'
        },
        {
          productId: 'removed-spec',
          specId: 'missing-spec',
          quantity: 1,
          selected: true,
          snapshot: {
            name: '旧商品',
            summary: '',
            thumbnail: '',
            specLabel: '旧规格',
            unitPrice: 88,
            stock: 1,
            deliveryModes: ['delivery']
          },
          updatedAt: '2026-06-24T00:00:00.000Z'
        }
      ]
    });
    hydrateCartFromStorage({ now: Date.parse('2026-06-25T00:00:00.000Z') });

    const result = await reconcileCartWithCatalog(async () => ({
      ok: true,
      lines: [
        {
          productId: 'ocean-party',
          requestedSpecId: 'ocean-party-4-chicken',
          resolvedSpecId: 'ocean-party-4-chicken',
          status: 'quantity_adjusted',
          product: {
            id: 'ocean-party',
            name: '海洋奇遇',
            summary: '新简介',
            thumbnail: 'new.jpg',
            stock: 2,
            soldOut: false,
            deliveryModes: ['delivery', 'pickup'],
            updatedAt: '2026-06-25T00:00:00.000Z'
          },
          spec: {
            id: 'ocean-party-4-chicken',
            label: '4寸 鸡肉',
            price: 188
          },
          requestedQuantity: 5,
          resolvedQuantity: 2,
          changes: ['stock', 'price', 'label']
        },
        {
          productId: 'removed-spec',
          requestedSpecId: 'missing-spec',
          resolvedSpecId: '',
          status: 'spec_unavailable',
          requestedQuantity: 1,
          resolvedQuantity: 0,
          changes: ['availability']
        }
      ]
    }));

    expect(result).toMatchObject({ ok: true, changed: true, hasBlockingChanges: true });
    expect(getCartItems()).toEqual([
      expect.objectContaining({
        productId: 'ocean-party',
        name: '海洋奇遇',
        specLabel: '4寸 鸡肉',
        price: 188,
        stock: 2,
        quantity: 2,
        selected: true,
        validationStatus: 'available'
      }),
      expect.objectContaining({
        productId: 'removed-spec',
        selected: false,
        validationStatus: 'spec_unavailable'
      })
    ]);
    expect(getCartCount()).toBe(2);
    expect(getCartSummary().selectedCount).toBe(2);
  });

  it('keeps unverified cart rows when reconciliation fails', async () => {
    const product = getProductById('sea-sponge');

    if (!product) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, '', 1);
    hydrateCartFromStorage({ now: Date.parse('2026-06-25T00:00:00.000Z') });

    const result = await reconcileCartWithCatalog(async () => {
      throw new Error('network failed');
    });

    expect(result).toMatchObject({ ok: false, changed: false, hasBlockingChanges: true });
    expect(getCartItems()[0]).toMatchObject({
      productId: product.id,
      validationStatus: 'unverified'
    });
    expect(hasUnverifiedCartItems()).toBe(true);
  });

  it('does not let quantity exceed stock', () => {
    const product = getProductById('sea-sponge');

    if (!product) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, '', 5);

    expect(getCartItems()[0]?.quantity).toBe(product.stock);
    expect(updateCartItemQuantity(getCartItems()[0]!.id, product.stock + 1).capped).toBe(true);
  });

  it('supports select all, deselect, remove, and summary totals', () => {
    const a = getProductById('sea-sponge');
    const b = getProductById('ocean-party');

    if (!a || !b) {
      throw new Error('missing product fixture');
    }

    addCartItem(a, '', 2);
    addCartItem(b, b.specs[0]?.id ?? '', 1);
    updateCartItemSelection(getCartItems()[0]!.id, false);

    expect(getCartSummary().selectedTotalPrice).toBe(b.price);

    toggleAllCartItems(true);
    expect(getCartSummary().selectedCount).toBe(3);

    removeCartItem(getCartItems()[0]!.id);
    expect(getCartItems()).toHaveLength(1);
  });

  it('tracks selected cart fulfillment compatibility and groups cart rows by supported modes', () => {
    addCartItem(createFulfillmentProduct('delivery-only', ['delivery']), '', 1);
    addCartItem(createFulfillmentProduct('pickup-only', ['pickup']), '', 1);

    expect(getCartItemGroups().map((group) => group.label)).toEqual(['仅配送', '仅自取']);
    expect(getSelectedCartFulfillmentModes()).toEqual([]);
    expect(getCartSummary()).toMatchObject({
      selectedCount: 2,
      canCheckoutSelectedItems: false,
      selectedFulfillmentModes: []
    });

    updateCartItemSelection(getCartItems()[1]!.id, false);

    expect(getSelectedCartFulfillmentModes()).toEqual(['delivery']);
    expect(getCartSummary()).toMatchObject({
      selectedCount: 1,
      canCheckoutSelectedItems: true,
      selectedFulfillmentModes: ['delivery']
    });
  });

  it('reads quantity by product and spec key for inline steppers', () => {
    const directProduct = getProductById('sea-sponge');
    const specProduct = getProductById('ocean-party');

    if (!directProduct || !specProduct) {
      throw new Error('missing product fixture');
    }

    addCartItem(directProduct, '', 2);
    addCartItem(specProduct, specProduct.specs[0]?.id ?? '', 1);

    expect(getCartProductQuantity(directProduct.id)).toBe(2);
    expect(getCartProductQuantity(specProduct.id, specProduct.specs[0]?.id ?? '')).toBe(1);
    expect(getCartProductQuantity(specProduct.id)).toBe(0);
  });

  it('aggregates total quantity across specs for complex product badges', () => {
    const specProduct = getProductById('ocean-party');

    if (!specProduct || specProduct.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    addCartItem(specProduct, specProduct.specs[0]!.id, 1);
    addCartItem(specProduct, specProduct.specs[1]!.id, 2);

    expect(getCartProductTotalQuantity(specProduct.id)).toBe(3);
  });

  it('updates quantity by product key for inline steppers', () => {
    const directProduct = getProductById('sea-sponge');

    if (!directProduct) {
      throw new Error('missing product fixture');
    }

    addCartItem(directProduct, '', 2);
    updateCartProductQuantity(directProduct.id, '', 1);
    expect(getCartProductQuantity(directProduct.id)).toBe(1);

    updateCartProductQuantity(directProduct.id, '', 0);
    expect(getCartProductQuantity(directProduct.id)).toBe(0);
  });

  it('keeps the merged cart row selected when switching specs into an already-selected row', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    addCartItem(product, firstSpecId, 1);
    addCartItem(product, secondSpecId, 1);

    const firstRow = getCartItems().find((item) => item.specId === firstSpecId);
    const secondRow = getCartItems().find((item) => item.specId === secondSpecId);

    if (!firstRow || !secondRow) {
      throw new Error('missing seeded cart rows');
    }

    updateCartItemSelection(firstRow.id, false);
    updateCartItemSelection(secondRow.id, true);

    updateCartItemSpec(firstRow.id, product, secondSpecId);

    expect(getCartItems()).toHaveLength(1);
    expect(getCartItems()[0]?.specId).toBe(secondSpecId);
    expect(getCartItems()[0]?.quantity).toBe(2);
    expect(getCartItems()[0]?.selected).toBe(true);
  });

  it('rejects a spec switch before mutating when target stock cannot fit the current quantity', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    addCartItem(product, firstSpecId, 4);
    addCartItem(product, secondSpecId, product.stock);

    const sourceRow = getCartItems().find((item) => item.specId === firstSpecId);

    if (!sourceRow) {
      throw new Error('missing source cart row');
    }

    const before = getCartItems().map((item) => ({
      id: item.id,
      specId: item.specId,
      quantity: item.quantity
    }));

    const result = updateCartItemSpec(sourceRow.id, product, secondSpecId);

    expect(result.item).toBe(null);
    expect(result.capped).toBe(true);
    expect(result.replacedItemId).toBe(null);
    expect(getCartItems().map((item) => ({
      id: item.id,
      specId: item.specId,
      quantity: item.quantity
    }))).toEqual(before);
  });

  it('returns the surviving row identity when a spec switch merges into an existing row', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    addCartItem(product, firstSpecId, 1);
    addCartItem(product, secondSpecId, 2);

    const sourceRow = getCartItems().find((item) => item.specId === firstSpecId);

    if (!sourceRow) {
      throw new Error('missing source cart row');
    }

    const result = updateCartItemSpec(sourceRow.id, product, secondSpecId);

    expect(result.item?.id).toBe(getCartItems()[0]?.id);
    expect(result.item?.quantity).toBe(3);
    expect(result.replacedItemId).toBe(sourceRow.id);
    expect(result.mergedFromItemId).toBe(getCartItems()[0]?.id);
    expect(result.capped).toBe(false);
  });

  it('refreshes the surviving row stock ceiling after a spec switch merge when stock drops', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const originalStock = product.stock;
    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    try {
      addCartItem(product, firstSpecId, 2);
      addCartItem(product, secondSpecId, 1);

      product.stock = 3;

      const sourceRow = getCartItems().find((item) => item.specId === firstSpecId);

      if (!sourceRow) {
        throw new Error('missing source cart row');
      }

      const result = updateCartItemSpec(sourceRow.id, product, secondSpecId);

      if (!result.item) {
        throw new Error('missing surviving cart row');
      }

      expect(result.item.stock).toBe(3);
      expect(result.item.quantity).toBe(3);
      expect(updateCartItemQuantity(result.item.id, 5).capped).toBe(true);
      expect(getCartItems()[0]?.quantity).toBe(3);
    } finally {
      product.stock = originalStock;
    }
  });

  it('refreshes the target row stock ceiling when a spec switch merge is rejected after stock drops', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const originalStock = product.stock;
    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    try {
      addCartItem(product, firstSpecId, 3);
      addCartItem(product, secondSpecId, 2);

      product.stock = 3;

      const sourceRow = getCartItems().find((item) => item.specId === firstSpecId);
      const targetRow = getCartItems().find((item) => item.specId === secondSpecId);

      if (!sourceRow || !targetRow) {
        throw new Error('missing seeded cart rows');
      }

      const result = updateCartItemSpec(sourceRow.id, product, secondSpecId);

      expect(result.item).toBe(null);
      expect(result.capped).toBe(true);
      expect(getCartItems()).toHaveLength(2);
      expect(getCartItems().find((item) => item.id === targetRow.id)?.stock).toBe(3);
      expect(updateCartItemQuantity(targetRow.id, 5).capped).toBe(true);
      expect(getCartItems().find((item) => item.id === targetRow.id)?.quantity).toBe(3);
    } finally {
      product.stock = originalStock;
    }
  });

  it('caps later source-row quantity updates after a rejected spec switch with an existing target row', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const originalStock = product.stock;
    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    try {
      addCartItem(product, firstSpecId, 3);
      addCartItem(product, secondSpecId, 2);

      product.stock = 3;

      const sourceRow = getCartItems().find((item) => item.specId === firstSpecId);

      if (!sourceRow) {
        throw new Error('missing source cart row');
      }

      const result = updateCartItemSpec(sourceRow.id, product, secondSpecId);

      expect(result.item).toBe(null);
      expect(result.capped).toBe(true);
      expect(updateCartItemQuantity(sourceRow.id, 5).capped).toBe(true);
      expect(getCartItems().find((item) => item.id === sourceRow.id)?.quantity).toBe(3);
    } finally {
      product.stock = originalStock;
    }
  });

  it('caps later source-row quantity updates after a rejected spec switch without a target row', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const originalStock = product.stock;
    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    try {
      addCartItem(product, firstSpecId, 5);

      product.stock = 3;

      const sourceRow = getCartItems().find((item) => item.specId === firstSpecId);

      if (!sourceRow) {
        throw new Error('missing source cart row');
      }

      const result = updateCartItemSpec(sourceRow.id, product, secondSpecId);

      expect(result.item).toBe(null);
      expect(result.capped).toBe(true);
      expect(updateCartItemQuantity(sourceRow.id, 5).capped).toBe(true);
      expect(getCartItems().find((item) => item.id === sourceRow.id)?.quantity).toBe(3);
    } finally {
      product.stock = originalStock;
    }
  });
});
