import {
  resolveCartLines,
  type ResolveCartLinesRequestLine,
  type ResolvedCartLine
} from './catalog';
import type { CatalogProduct, DeliveryMode, ProductSpecOption } from '../types/catalog';

declare const wx: any;

export const CUSTOMER_CART_STORAGE_KEY = 'xiaipet:customer:cart:v1';
const CART_STORAGE_SCHEMA_VERSION = 1;
const CART_STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CartValidationStatus =
  | 'available'
  | 'unverified'
  | 'product_unavailable'
  | 'spec_unavailable'
  | 'sold_out';

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
  validationStatus: CartValidationStatus;
  validationMessage: string;
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

interface PersistedCartStateV1 {
  schemaVersion: 1;
  updatedAt: string;
  items: PersistedCartItemV1[];
}

interface PersistedCartItemV1 {
  productId: string;
  specId: string;
  quantity: number;
  selected: boolean;
  snapshot: {
    name: string;
    summary: string;
    thumbnail: string;
    specLabel: string;
    unitPrice: number;
    stock: number;
    deliveryModes: DeliveryMode[];
  };
  updatedAt: string;
}

interface HydrateCartOptions {
  now?: number;
}

export interface CartReconcileResult {
  ok: boolean;
  changed: boolean;
  hasBlockingChanges: boolean;
  error?: unknown;
}

type CartLineResolver = (
  lines: ResolveCartLinesRequestLine[]
) => Promise<{ ok?: boolean; lines: ResolvedCartLine[] }>;

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

function getWxApi() {
  return typeof wx === 'undefined' ? null : wx;
}

function isDeliveryMode(value: unknown): value is DeliveryMode {
  return value === 'delivery' || value === 'pickup' || value === 'express';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isInvalidCartStatus(status: CartValidationStatus) {
  return status === 'product_unavailable' || status === 'spec_unavailable' || status === 'sold_out';
}

function isCheckoutEligible(item: CartItem) {
  return !isInvalidCartStatus(item.validationStatus);
}

function getCartValidationMessage(status: CartValidationStatus) {
  if (status === 'product_unavailable') {
    return '商品已下架，请重新选择';
  }

  if (status === 'spec_unavailable') {
    return '规格已调整，请重新选择';
  }

  if (status === 'sold_out') {
    return '商品已售罄';
  }

  if (status === 'unverified') {
    return '商品信息待刷新';
  }

  return '';
}

function toPersistedCartItem(item: CartItem, nowIso: string): PersistedCartItemV1 {
  return {
    productId: item.productId,
    specId: item.specId,
    quantity: item.quantity,
    selected: item.selected,
    snapshot: {
      name: item.name,
      summary: item.summary,
      thumbnail: item.thumbnail,
      specLabel: item.specLabel,
      unitPrice: item.price,
      stock: item.stock,
      deliveryModes: normalizeDeliveryModes(item.deliveryModes)
    },
    updatedAt: nowIso
  };
}

function normalizePersistedCartItem(value: unknown): PersistedCartItemV1 | null {
  if (!isObject(value) || !isObject(value.snapshot)) {
    return null;
  }

  const productId = typeof value.productId === 'string' ? value.productId : '';
  const specId = typeof value.specId === 'string' ? value.specId : '';
  const quantity = typeof value.quantity === 'number' && Number.isFinite(value.quantity)
    ? Math.max(1, Math.trunc(value.quantity))
    : 0;
  const selected = Boolean(value.selected);
  const snapshot = value.snapshot;
  const name = typeof snapshot.name === 'string' ? snapshot.name : '';

  if (!productId || !name || quantity <= 0) {
    return null;
  }

  return {
    productId,
    specId,
    quantity,
    selected,
    snapshot: {
      name,
      summary: typeof snapshot.summary === 'string' ? snapshot.summary : '',
      thumbnail: typeof snapshot.thumbnail === 'string' ? snapshot.thumbnail : '',
      specLabel: typeof snapshot.specLabel === 'string' ? snapshot.specLabel : '',
      unitPrice: typeof snapshot.unitPrice === 'number' && Number.isFinite(snapshot.unitPrice) ? snapshot.unitPrice : 0,
      stock: typeof snapshot.stock === 'number' && Number.isFinite(snapshot.stock) ? snapshot.stock : quantity,
      deliveryModes: Array.isArray(snapshot.deliveryModes)
        ? snapshot.deliveryModes.filter(isDeliveryMode)
        : []
    },
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString()
  };
}

function toCartItemFromPersisted(item: PersistedCartItemV1): CartItem {
  return {
    id: buildCartItemId(item.productId, item.specId),
    productId: item.productId,
    name: item.snapshot.name,
    summary: item.snapshot.summary,
    thumbnail: item.snapshot.thumbnail,
    price: item.snapshot.unitPrice,
    stock: item.snapshot.stock,
    quantity: item.quantity,
    selected: item.selected,
    specId: item.specId,
    specLabel: item.snapshot.specLabel,
    specs: item.specId
      ? [{ id: item.specId, label: item.snapshot.specLabel, price: item.snapshot.unitPrice }]
      : [],
    deliveryModes: normalizeDeliveryModes(item.snapshot.deliveryModes),
    validationStatus: 'unverified',
    validationMessage: getCartValidationMessage('unverified')
  };
}

function readPersistedCartState(now = Date.now()): PersistedCartStateV1 | null {
  const wxApi = getWxApi();
  const raw = wxApi?.getStorageSync?.(CUSTOMER_CART_STORAGE_KEY);

  if (!isObject(raw) || raw.schemaVersion !== CART_STORAGE_SCHEMA_VERSION || typeof raw.updatedAt !== 'string') {
    return null;
  }

  const updatedAt = Date.parse(raw.updatedAt);
  if (!Number.isFinite(updatedAt) || now - updatedAt > CART_STORAGE_TTL_MS) {
    return null;
  }

  const items = Array.isArray(raw.items)
    ? (raw.items.map(normalizePersistedCartItem).filter(Boolean) as PersistedCartItemV1[])
    : [];

  return {
    schemaVersion: CART_STORAGE_SCHEMA_VERSION,
    updatedAt: raw.updatedAt,
    items
  };
}

export function clearCartStorage() {
  try {
    getWxApi()?.removeStorageSync?.(CUSTOMER_CART_STORAGE_KEY);
  } catch {
    // Best effort local cleanup only.
  }
}

export function persistCart() {
  const wxApi = getWxApi();

  if (!wxApi?.setStorageSync) {
    return;
  }

  if (!cartItems.length) {
    clearCartStorage();
    return;
  }

  const nowIso = new Date().toISOString();
  const state: PersistedCartStateV1 = {
    schemaVersion: CART_STORAGE_SCHEMA_VERSION,
    updatedAt: nowIso,
    items: cartItems.map((item) => toPersistedCartItem(item, nowIso))
  };

  try {
    wxApi.setStorageSync(CUSTOMER_CART_STORAGE_KEY, state);
  } catch {
    // Local persistence should not block cart mutations.
  }
}

export function hydrateCartFromStorage(options: HydrateCartOptions = {}) {
  const state = readPersistedCartState(options.now ?? Date.now());

  if (!state) {
    cartItems = [];
    clearCartStorage();
    return cartItems;
  }

  cartItems = state.items.map(toCartItemFromPersisted);
  return cartItems;
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
  return cartItems.filter((item) => item.selected && isCheckoutEligible(item));
}

export function getCartProductQuantity(productId: string, specId = '') {
  const item = getCartItemById(buildCartItemId(productId, specId));
  return item && isCheckoutEligible(item) ? item.quantity : 0;
}

export function getCartProductTotalQuantity(productId: string) {
  return cartItems
    .filter((item) => item.productId === productId && isCheckoutEligible(item))
    .reduce((total, item) => total + item.quantity, 0);
}

export function updateCartProductQuantity(productId: string, specId = '', nextQuantity: number) {
  return updateCartItemQuantity(buildCartItemId(productId, specId), nextQuantity);
}

export function clearCart() {
  cartItems = [];
  clearCartStorage();
}

export function getCartItems() {
  return cartItems;
}

export function getCartItemById(itemId: string) {
  return cartItems.find((item) => item.id === itemId) ?? null;
}

export function getCartCount() {
  return cartItems
    .filter(isCheckoutEligible)
    .reduce((total, item) => total + item.quantity, 0);
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
    canCheckoutSelectedItems:
      selectedItems.length > 0 &&
      selectedFulfillmentModes.length > 0
  };
}

export function hasUnverifiedCartItems() {
  return cartItems.some((item) => item.validationStatus === 'unverified');
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
    existingItem.validationStatus = 'available';
    existingItem.validationMessage = '';
    persistCart();
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
    deliveryModes: normalizeDeliveryModes(product.deliveryModes),
    validationStatus: 'available',
    validationMessage: ''
  };

  cartItems = [...cartItems, item];
  persistCart();
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
  persistCart();
  return { item, capped };
}

export function updateCartItemSelection(itemId: string, selected: boolean) {
  const item = cartItems.find((entry) => entry.id === itemId) ?? null;

  if (item) {
    item.selected = selected;
    persistCart();
  }

  return item;
}

export function toggleAllCartItems(selected: boolean) {
  cartItems = cartItems.map((item) => ({
    ...item,
    selected
  }));
  persistCart();
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
    item.validationStatus = 'available';
    item.validationMessage = '';
    persistCart();
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
  persistCart();
  return cartItems;
}

export function removeSelectedCartItems() {
  cartItems = cartItems.filter((item) => !item.selected);
  persistCart();
  return cartItems;
}

function cartLineKey(productId: string, specId: string) {
  return buildCartItemId(productId, specId);
}

function hasItemDisplayChanged(item: CartItem, line: ResolvedCartLine) {
  return Boolean(
    line.product &&
      (item.name !== line.product.name ||
        item.summary !== line.product.summary ||
        item.thumbnail !== line.product.thumbnail ||
        item.stock !== line.product.stock ||
        item.deliveryModes.join('|') !== normalizeDeliveryModes(line.product.deliveryModes).join('|')) ||
      line.spec &&
        (item.specId !== line.resolvedSpecId ||
          item.specLabel !== line.spec.label ||
          item.price !== line.spec.price) ||
      item.quantity !== line.resolvedQuantity ||
      item.validationStatus !== 'available'
  );
}

function applyResolvedAvailableLine(item: CartItem, line: ResolvedCartLine) {
  if (line.product) {
    item.name = line.product.name;
    item.summary = line.product.summary;
    item.thumbnail = line.product.thumbnail;
    item.stock = line.product.stock;
    item.deliveryModes = normalizeDeliveryModes(line.product.deliveryModes);
  }

  if (line.spec) {
    item.specId = line.resolvedSpecId;
    item.specLabel = line.spec.label;
    item.price = line.spec.price;
    item.specs = line.spec.id ? [line.spec] : [];
    item.id = buildCartItemId(item.productId, item.specId);
  }

  item.quantity = Math.max(1, line.resolvedQuantity);
  item.validationStatus = 'available';
  item.validationMessage = '';
}

function applyResolvedInvalidLine(item: CartItem, line: ResolvedCartLine) {
  if (line.product) {
    item.name = line.product.name;
    item.summary = line.product.summary;
    item.thumbnail = line.product.thumbnail;
    item.stock = line.product.stock;
    item.deliveryModes = normalizeDeliveryModes(line.product.deliveryModes);
  }

  item.selected = false;
  item.validationStatus =
    line.status === 'sold_out' || line.status === 'product_unavailable' || line.status === 'spec_unavailable'
      ? line.status
      : 'unverified';
  item.validationMessage = getCartValidationMessage(item.validationStatus);
}

export async function reconcileCartWithCatalog(
  resolve: CartLineResolver = resolveCartLines
): Promise<CartReconcileResult> {
  if (!cartItems.length) {
    return { ok: true, changed: false, hasBlockingChanges: false };
  }

  const requestLines = cartItems.map((item) => ({
    productId: item.productId,
    specId: item.specId,
    quantity: item.quantity
  }));

  let response: Awaited<ReturnType<CartLineResolver>>;
  try {
    response = await resolve(requestLines);
  } catch (error) {
    cartItems = cartItems.map((item) => ({
      ...item,
      validationStatus: 'unverified',
      validationMessage: getCartValidationMessage('unverified')
    }));
    persistCart();
    return { ok: false, changed: false, hasBlockingChanges: true, error };
  }

  const linesByKey = new Map(
    response.lines.map((line) => [cartLineKey(line.productId, line.requestedSpecId), line])
  );
  let changed = false;
  let hasBlockingChanges = false;

  cartItems.forEach((item) => {
    const line = linesByKey.get(cartLineKey(item.productId, item.specId));
    const wasSelected = item.selected;

    if (!line) {
      if (item.validationStatus !== 'unverified') {
        changed = true;
      }
      item.validationStatus = 'unverified';
      item.validationMessage = getCartValidationMessage('unverified');
      hasBlockingChanges = hasBlockingChanges || wasSelected;
      return;
    }

    if (line.status === 'available' || line.status === 'quantity_adjusted') {
      const lineChanged = hasItemDisplayChanged(item, line);
      applyResolvedAvailableLine(item, line);
      changed = changed || lineChanged || line.status === 'quantity_adjusted' || line.changes.length > 0;
      hasBlockingChanges = hasBlockingChanges || (wasSelected && (lineChanged || line.status === 'quantity_adjusted' || line.changes.length > 0));
      return;
    }

    applyResolvedInvalidLine(item, line);
    changed = true;
    hasBlockingChanges = hasBlockingChanges || wasSelected;
  });

  persistCart();
  return {
    ok: response.ok !== false,
    changed,
    hasBlockingChanges
  };
}
