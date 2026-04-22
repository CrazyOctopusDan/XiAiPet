import { beforeEach, describe, expect, it } from 'vitest';

import { getProductById } from './catalog';
import {
  addCartItem,
  clearCart,
  getCartCount,
  getCartItems,
  getCartProductQuantity,
  getCartProductTotalQuantity,
  getCartSummary,
  removeCartItem,
  toggleAllCartItems,
  updateCartItemSpec,
  updateCartItemQuantity,
  updateCartProductQuantity,
  updateCartItemSelection
} from './cart';

describe('cart service', () => {
  beforeEach(() => {
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
