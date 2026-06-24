"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOMER_CART_STORAGE_KEY = void 0;
exports.clearCartStorage = clearCartStorage;
exports.persistCart = persistCart;
exports.hydrateCartFromStorage = hydrateCartFromStorage;
exports.getCartProductQuantity = getCartProductQuantity;
exports.getCartProductTotalQuantity = getCartProductTotalQuantity;
exports.updateCartProductQuantity = updateCartProductQuantity;
exports.clearCart = clearCart;
exports.getCartItems = getCartItems;
exports.getCartItemById = getCartItemById;
exports.getCartCount = getCartCount;
exports.getCartSummary = getCartSummary;
exports.hasUnverifiedCartItems = hasUnverifiedCartItems;
exports.getSelectedCartFulfillmentModes = getSelectedCartFulfillmentModes;
exports.getCartItemGroups = getCartItemGroups;
exports.addCartItem = addCartItem;
exports.updateCartItemQuantity = updateCartItemQuantity;
exports.updateCartItemSelection = updateCartItemSelection;
exports.toggleAllCartItems = toggleAllCartItems;
exports.updateCartItemSpec = updateCartItemSpec;
exports.removeCartItem = removeCartItem;
exports.removeSelectedCartItems = removeSelectedCartItems;
exports.reconcileCartWithCatalog = reconcileCartWithCatalog;
const catalog_1 = require("./catalog");
exports.CUSTOMER_CART_STORAGE_KEY = 'xiaipet:customer:cart:v1';
const CART_STORAGE_SCHEMA_VERSION = 1;
const CART_STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let cartItems = [];
const FULFILLMENT_MODE_ORDER = ['delivery', 'pickup', 'express'];
const FULFILLMENT_MODE_LABELS = {
    delivery: '配送',
    pickup: '自取',
    express: '快递'
};
function resolveSpec(product, specId) {
    var _a;
    if (!product.specs.length) {
        return {
            specId: '',
            specLabel: '',
            price: product.price
        };
    }
    const fallback = product.specs[0];
    const spec = (_a = product.specs.find((item) => item.id === specId)) !== null && _a !== void 0 ? _a : fallback;
    return {
        specId: spec.id,
        specLabel: spec.label,
        price: spec.price
    };
}
function buildCartItemId(productId, specId) {
    return `${productId}::${specId || 'default'}`;
}
function getWxApi() {
    return typeof wx === 'undefined' ? null : wx;
}
function isDeliveryMode(value) {
    return value === 'delivery' || value === 'pickup' || value === 'express';
}
function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isInvalidCartStatus(status) {
    return status === 'product_unavailable' || status === 'spec_unavailable' || status === 'sold_out';
}
function isCheckoutEligible(item) {
    return !isInvalidCartStatus(item.validationStatus);
}
function getCartValidationMessage(status) {
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
function toPersistedCartItem(item, nowIso) {
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
function normalizePersistedCartItem(value) {
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
function toCartItemFromPersisted(item) {
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
function readPersistedCartState(now = Date.now()) {
    var _a;
    const wxApi = getWxApi();
    const raw = (_a = wxApi === null || wxApi === void 0 ? void 0 : wxApi.getStorageSync) === null || _a === void 0 ? void 0 : _a.call(wxApi, exports.CUSTOMER_CART_STORAGE_KEY);
    if (!isObject(raw) || raw.schemaVersion !== CART_STORAGE_SCHEMA_VERSION || typeof raw.updatedAt !== 'string') {
        return null;
    }
    const updatedAt = Date.parse(raw.updatedAt);
    if (!Number.isFinite(updatedAt) || now - updatedAt > CART_STORAGE_TTL_MS) {
        return null;
    }
    const items = Array.isArray(raw.items)
        ? raw.items.map(normalizePersistedCartItem).filter(Boolean)
        : [];
    return {
        schemaVersion: CART_STORAGE_SCHEMA_VERSION,
        updatedAt: raw.updatedAt,
        items
    };
}
function clearCartStorage() {
    var _a, _b;
    try {
        (_b = (_a = getWxApi()) === null || _a === void 0 ? void 0 : _a.removeStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, exports.CUSTOMER_CART_STORAGE_KEY);
    }
    catch (_c) {
        // Best effort local cleanup only.
    }
}
function persistCart() {
    const wxApi = getWxApi();
    if (!(wxApi === null || wxApi === void 0 ? void 0 : wxApi.setStorageSync)) {
        return;
    }
    if (!cartItems.length) {
        clearCartStorage();
        return;
    }
    const nowIso = new Date().toISOString();
    const state = {
        schemaVersion: CART_STORAGE_SCHEMA_VERSION,
        updatedAt: nowIso,
        items: cartItems.map((item) => toPersistedCartItem(item, nowIso))
    };
    try {
        wxApi.setStorageSync(exports.CUSTOMER_CART_STORAGE_KEY, state);
    }
    catch (_a) {
        // Local persistence should not block cart mutations.
    }
}
function hydrateCartFromStorage(options = {}) {
    var _a;
    const state = readPersistedCartState((_a = options.now) !== null && _a !== void 0 ? _a : Date.now());
    if (!state) {
        cartItems = [];
        clearCartStorage();
        return cartItems;
    }
    cartItems = state.items.map(toCartItemFromPersisted);
    return cartItems;
}
function canMergeQuantity(targetQuantity, incomingQuantity, stock) {
    return targetQuantity + incomingQuantity <= stock;
}
function normalizeDeliveryModes(modes = []) {
    const allowedModes = new Set(modes);
    const normalized = FULFILLMENT_MODE_ORDER.filter((mode) => allowedModes.has(mode));
    return normalized.length ? normalized : [...FULFILLMENT_MODE_ORDER];
}
function getFulfillmentLabel(modes) {
    const normalized = normalizeDeliveryModes(modes);
    if (normalized.length === 1) {
        return `仅${FULFILLMENT_MODE_LABELS[normalized[0]]}`;
    }
    return normalized.map((mode) => FULFILLMENT_MODE_LABELS[mode]).join('/');
}
function getSelectedCartItems() {
    return cartItems.filter((item) => item.selected && isCheckoutEligible(item));
}
function getCartProductQuantity(productId, specId = '') {
    const item = getCartItemById(buildCartItemId(productId, specId));
    return item && isCheckoutEligible(item) ? item.quantity : 0;
}
function getCartProductTotalQuantity(productId) {
    return cartItems
        .filter((item) => item.productId === productId && isCheckoutEligible(item))
        .reduce((total, item) => total + item.quantity, 0);
}
function updateCartProductQuantity(productId, specId = '', nextQuantity) {
    return updateCartItemQuantity(buildCartItemId(productId, specId), nextQuantity);
}
function clearCart() {
    cartItems = [];
    clearCartStorage();
}
function getCartItems() {
    return cartItems;
}
function getCartItemById(itemId) {
    var _a;
    return (_a = cartItems.find((item) => item.id === itemId)) !== null && _a !== void 0 ? _a : null;
}
function getCartCount() {
    return cartItems
        .filter(isCheckoutEligible)
        .reduce((total, item) => total + item.quantity, 0);
}
function getCartSummary() {
    const selectedItems = getSelectedCartItems();
    const selectedFulfillmentModes = getSelectedCartFulfillmentModes();
    return {
        selectedCount: selectedItems.reduce((total, item) => total + item.quantity, 0),
        selectedTotalPrice: Number(selectedItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)),
        isAllSelected: cartItems.length > 0 && cartItems.every((item) => item.selected),
        selectedFulfillmentModes,
        canCheckoutSelectedItems: selectedItems.length > 0 &&
            selectedFulfillmentModes.length > 0
    };
}
function hasUnverifiedCartItems() {
    return cartItems.some((item) => item.validationStatus === 'unverified');
}
function getSelectedCartFulfillmentModes() {
    const selectedItems = getSelectedCartItems();
    if (!selectedItems.length) {
        return [...FULFILLMENT_MODE_ORDER];
    }
    return FULFILLMENT_MODE_ORDER.filter((mode) => selectedItems.every((item) => normalizeDeliveryModes(item.deliveryModes).includes(mode)));
}
function getCartItemGroups(items = cartItems) {
    const groups = new Map();
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
function addCartItem(product, specId, quantity = 1) {
    var _a, _b;
    const resolvedSpec = resolveSpec(product, specId);
    const itemId = buildCartItemId(product.id, resolvedSpec.specId);
    const existingItem = cartItems.find((item) => item.id === itemId);
    const nextQuantity = Math.min(product.stock, ((_a = existingItem === null || existingItem === void 0 ? void 0 : existingItem.quantity) !== null && _a !== void 0 ? _a : 0) + quantity);
    const capped = nextQuantity < ((_b = existingItem === null || existingItem === void 0 ? void 0 : existingItem.quantity) !== null && _b !== void 0 ? _b : 0) + quantity;
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
    const item = {
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
function updateCartItemQuantity(itemId, nextQuantity) {
    var _a;
    const item = (_a = cartItems.find((entry) => entry.id === itemId)) !== null && _a !== void 0 ? _a : null;
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
function updateCartItemSelection(itemId, selected) {
    var _a;
    const item = (_a = cartItems.find((entry) => entry.id === itemId)) !== null && _a !== void 0 ? _a : null;
    if (item) {
        item.selected = selected;
        persistCart();
    }
    return item;
}
function toggleAllCartItems(selected) {
    cartItems = cartItems.map((item) => ({
        ...item,
        selected
    }));
    persistCart();
    return cartItems;
}
function updateCartItemSpec(itemId, product, specId) {
    var _a, _b, _c;
    const item = (_a = cartItems.find((entry) => entry.id === itemId)) !== null && _a !== void 0 ? _a : null;
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
    const targetItem = (_b = cartItems.find((entry) => entry.id === nextItemId)) !== null && _b !== void 0 ? _b : null;
    const mergedSelected = item.selected || (targetItem === null || targetItem === void 0 ? void 0 : targetItem.selected) || false;
    if (targetItem) {
        if (!canMergeQuantity(targetItem.quantity, item.quantity, product.stock)) {
            item.stock = product.stock;
            targetItem.stock = product.stock;
            return { item: null, replacedItemId: null, mergedFromItemId: null, capped: true };
        }
    }
    else if (item.quantity > product.stock) {
        item.stock = product.stock;
        return { item: null, replacedItemId: null, mergedFromItemId: null, capped: true };
    }
    const replacedItemId = item.id;
    const mergedFromItemId = (_c = targetItem === null || targetItem === void 0 ? void 0 : targetItem.id) !== null && _c !== void 0 ? _c : null;
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
function removeCartItem(itemId) {
    cartItems = cartItems.filter((item) => item.id !== itemId);
    persistCart();
    return cartItems;
}
function removeSelectedCartItems() {
    cartItems = cartItems.filter((item) => !item.selected);
    persistCart();
    return cartItems;
}
function cartLineKey(productId, specId) {
    return buildCartItemId(productId, specId);
}
function hasItemDisplayChanged(item, line) {
    return Boolean(line.product &&
        (item.name !== line.product.name ||
            item.summary !== line.product.summary ||
            item.thumbnail !== line.product.thumbnail ||
            item.stock !== line.product.stock ||
            item.deliveryModes.join('|') !== normalizeDeliveryModes(line.product.deliveryModes).join('|')) ||
        line.spec &&
            (item.specId !== line.resolvedSpecId ||
                item.specLabel !== line.spec.label ||
                item.price !== line.spec.price) ||
        item.quantity !== line.resolvedQuantity);
}
function applyResolvedAvailableLine(item, line) {
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
function applyResolvedInvalidLine(item, line) {
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
async function reconcileCartWithCatalog(resolve = catalog_1.resolveCartLines) {
    if (!cartItems.length) {
        return { ok: true, changed: false, hasBlockingChanges: false };
    }
    const requestLines = cartItems.map((item) => ({
        productId: item.productId,
        specId: item.specId,
        quantity: item.quantity
    }));
    let response;
    try {
        response = await resolve(requestLines);
    }
    catch (error) {
        cartItems = cartItems.map((item) => ({
            ...item,
            validationStatus: 'unverified',
            validationMessage: getCartValidationMessage('unverified')
        }));
        persistCart();
        return { ok: false, changed: false, hasBlockingChanges: true, error };
    }
    const linesByKey = new Map(response.lines.map((line) => [cartLineKey(line.productId, line.requestedSpecId), line]));
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
            changed = changed || lineChanged;
            hasBlockingChanges = hasBlockingChanges || (wasSelected && lineChanged);
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
