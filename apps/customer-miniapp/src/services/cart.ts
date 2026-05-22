import type { CatalogProduct, DeliveryMode, ProductSpecOption } from '../types/catalog';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  summary: string;
  thumbnail: string;
  price: number;
  stock: number;
  quantity: number;
  selected: boolean;
  specId: string;
  specLabel: string;
  specs: ProductSpecOption[];
  deliveryModes: DeliveryMode[];
}

export interface CartItemGroup {
  key: string;
  label: string;
  items: CartItem[];
}

interface CartMutationResult {
  item: CartItem | null;
  capped: boolean;
}

export interface CartSpecUpdateResult {
  item: CartItem | null;
  replacedItemId: string | null;
  mergedFromItemId: string | null;
  capped: boolean;
}

let cartItems: CartItem[] = [];

const FULFILLMENT_MODE_ORDER: DeliveryMode[] = ['delivery', 'pickup', 'express'];
const FULFILLMENT_MODE_LABELS: Record<DeliveryMode, string> = {
  delivery: '配送',
  pickup: '自取',
  express: '快递'
};

function resolveSpec(product: CatalogProduct, specId: string) {
  if (!product.specs.length) {
    return {
      specId: '',
      specLabel: '',
      price: product.price
    };
  }

  const fallback = product.specs[0]!;
  const spec = product.specs.find((item) => item.id === specId) ?? fallback;
  return {
    specId: spec.id,
    specLabel: spec.label,
    price: spec.price
  };
}

function buildCartItemId(productId: string, specId: string) {
  return `${productId}::${specId || 'default'}`;
}

function canMergeQuantity(targetQuantity: number, incomingQuantity: number, stock: number) {
  return targetQuantity + incomingQuantity <= stock;
}

function normalizeDeliveryModes(modes: DeliveryMode[] = []) {
  const allowedModes = new Set(modes);
  const normalized = FULFILLMENT_MODE_ORDER.filter((mode) => allowedModes.has(mode));
  return normalized.length ? normalized : [...FULFILLMENT_MODE_ORDER];
}

function getFulfillmentLabel(modes: DeliveryMode[]) {
  const normalized = normalizeDeliveryModes(modes);

  if (normalized.length === 1) {
    return `仅${FULFILLMENT_MODE_LABELS[normalized[0]!]}`;
  }

  return normalized.map((mode) => FULFILLMENT_MODE_LABELS[mode]).join('/');
}

function getSelectedCartItems() {
  return cartItems.filter((item) => item.selected);
}

export function getCartProductQuantity(productId: string, specId = '') {
  return getCartItemById(buildCartItemId(productId, specId))?.quantity ?? 0;
}

export function getCartProductTotalQuantity(productId: string) {
  return cartItems
    .filter((item) => item.productId === productId)
    .reduce((total, item) => total + item.quantity, 0);
}

export function updateCartProductQuantity(productId: string, specId = '', nextQuantity: number) {
  return updateCartItemQuantity(buildCartItemId(productId, specId), nextQuantity);
}

export function clearCart() {
  cartItems = [];
}

export function getCartItems() {
  return cartItems;
}

export function getCartItemById(itemId: string) {
  return cartItems.find((item) => item.id === itemId) ?? null;
}

export function getCartCount() {
  return cartItems.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSummary() {
  const selectedItems = getSelectedCartItems();
  const selectedFulfillmentModes = getSelectedCartFulfillmentModes();
  return {
    selectedCount: selectedItems.reduce((total, item) => total + item.quantity, 0),
    selectedTotalPrice: Number(
      selectedItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)
    ),
    isAllSelected: cartItems.length > 0 && cartItems.every((item) => item.selected),
    selectedFulfillmentModes,
    canCheckoutSelectedItems: selectedItems.length > 0 && selectedFulfillmentModes.length > 0
  };
}

export function getSelectedCartFulfillmentModes() {
  const selectedItems = getSelectedCartItems();

  if (!selectedItems.length) {
    return [...FULFILLMENT_MODE_ORDER];
  }

  return FULFILLMENT_MODE_ORDER.filter((mode) =>
    selectedItems.every((item) => normalizeDeliveryModes(item.deliveryModes).includes(mode))
  );
}

export function getCartItemGroups(items = cartItems): CartItemGroup[] {
  const groups = new Map<string, CartItemGroup>();

  items.forEach((item) => {
    const modes = normalizeDeliveryModes(item.deliveryModes);
    const key = modes.join('|');
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.items.push(item);
      return;
    }

    groups.set(key, {
      key,
      label: getFulfillmentLabel(modes),
      items: [item]
    });
  });

  return [...groups.values()];
}

export function addCartItem(product: CatalogProduct, specId: string, quantity = 1): CartMutationResult {
  const resolvedSpec = resolveSpec(product, specId);
  const itemId = buildCartItemId(product.id, resolvedSpec.specId);
  const existingItem = cartItems.find((item) => item.id === itemId);
  const nextQuantity = Math.min(product.stock, (existingItem?.quantity ?? 0) + quantity);
  const capped = nextQuantity < (existingItem?.quantity ?? 0) + quantity;

  if (existingItem) {
    existingItem.quantity = nextQuantity;
    existingItem.price = resolvedSpec.price;
    existingItem.stock = product.stock;
    existingItem.specLabel = resolvedSpec.specLabel;
    existingItem.specId = resolvedSpec.specId;
    existingItem.deliveryModes = normalizeDeliveryModes(product.deliveryModes);
    return { item: existingItem, capped };
  }

  const item: CartItem = {
    id: itemId,
    productId: product.id,
    name: product.name,
    summary: product.summary,
    thumbnail: product.thumbnail,
    price: resolvedSpec.price,
    stock: product.stock,
    quantity: Math.min(product.stock, quantity),
    selected: true,
    specId: resolvedSpec.specId,
    specLabel: resolvedSpec.specLabel,
    specs: product.specs,
    deliveryModes: normalizeDeliveryModes(product.deliveryModes)
  };

  cartItems = [...cartItems, item];
  return { item, capped };
}

export function updateCartItemQuantity(itemId: string, nextQuantity: number): CartMutationResult {
  const item = cartItems.find((entry) => entry.id === itemId) ?? null;

  if (!item) {
    return { item: null, capped: false };
  }

  if (nextQuantity <= 0) {
    removeCartItem(itemId);
    return { item: null, capped: false };
  }

  const quantity = Math.min(item.stock, nextQuantity);
  const capped = quantity !== nextQuantity;
  item.quantity = quantity;
  return { item, capped };
}

export function updateCartItemSelection(itemId: string, selected: boolean) {
  const item = cartItems.find((entry) => entry.id === itemId) ?? null;

  if (item) {
    item.selected = selected;
  }

  return item;
}

export function toggleAllCartItems(selected: boolean) {
  cartItems = cartItems.map((item) => ({
    ...item,
    selected
  }));
  return cartItems;
}

export function updateCartItemSpec(
  itemId: string,
  product: CatalogProduct,
  specId: string
): CartSpecUpdateResult {
  const item = cartItems.find((entry) => entry.id === itemId) ?? null;

  if (!item) {
    return { item: null, replacedItemId: null, mergedFromItemId: null, capped: false };
  }

  const resolvedSpec = resolveSpec(product, specId);
  const nextItemId = buildCartItemId(product.id, resolvedSpec.specId);

  if (item.id === nextItemId) {
    item.stock = product.stock;
    item.deliveryModes = normalizeDeliveryModes(product.deliveryModes);
    return { item, replacedItemId: null, mergedFromItemId: null, capped: false };
  }

  const targetItem = cartItems.find((entry) => entry.id === nextItemId) ?? null;
  const mergedSelected = item.selected || targetItem?.selected || false;

  if (targetItem) {
    if (!canMergeQuantity(targetItem.quantity, item.quantity, product.stock)) {
      item.stock = product.stock;
      targetItem.stock = product.stock;
      return { item: null, replacedItemId: null, mergedFromItemId: null, capped: true };
    }
  } else if (item.quantity > product.stock) {
    item.stock = product.stock;
    return { item: null, replacedItemId: null, mergedFromItemId: null, capped: true };
  }

  const replacedItemId = item.id;
  const mergedFromItemId = targetItem?.id ?? null;
  removeCartItem(item.id);
  const result = addCartItem(product, resolvedSpec.specId, item.quantity);

  if (result.item) {
    result.item.selected = mergedSelected;
  }

  return {
    item: result.item,
    replacedItemId,
    mergedFromItemId,
    capped: result.capped
  };
}

export function removeCartItem(itemId: string) {
  cartItems = cartItems.filter((item) => item.id !== itemId);
  return cartItems;
}

export function removeSelectedCartItems() {
  cartItems = cartItems.filter((item) => !item.selected);
  return cartItems;
}
