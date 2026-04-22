"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCartProductQuantity = getCartProductQuantity;
exports.getCartProductTotalQuantity = getCartProductTotalQuantity;
exports.updateCartProductQuantity = updateCartProductQuantity;
exports.clearCart = clearCart;
exports.getCartItems = getCartItems;
exports.getCartItemById = getCartItemById;
exports.getCartCount = getCartCount;
exports.getCartSummary = getCartSummary;
exports.addCartItem = addCartItem;
exports.updateCartItemQuantity = updateCartItemQuantity;
exports.updateCartItemSelection = updateCartItemSelection;
exports.toggleAllCartItems = toggleAllCartItems;
exports.updateCartItemSpec = updateCartItemSpec;
exports.removeCartItem = removeCartItem;
let cartItems = [];
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
function canMergeQuantity(targetQuantity, incomingQuantity, stock) {
    return targetQuantity + incomingQuantity <= stock;
}
function getCartProductQuantity(productId, specId = '') {
    var _a, _b;
    return (_b = (_a = getCartItemById(buildCartItemId(productId, specId))) === null || _a === void 0 ? void 0 : _a.quantity) !== null && _b !== void 0 ? _b : 0;
}
function getCartProductTotalQuantity(productId) {
    return cartItems
        .filter((item) => item.productId === productId)
        .reduce((total, item) => total + item.quantity, 0);
}
function updateCartProductQuantity(productId, specId = '', nextQuantity) {
    return updateCartItemQuantity(buildCartItemId(productId, specId), nextQuantity);
}
function clearCart() {
    cartItems = [];
}
function getCartItems() {
    return cartItems;
}
function getCartItemById(itemId) {
    var _a;
    return (_a = cartItems.find((item) => item.id === itemId)) !== null && _a !== void 0 ? _a : null;
}
function getCartCount() {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
}
function getCartSummary() {
    const selectedItems = cartItems.filter((item) => item.selected);
    return {
        selectedCount: selectedItems.reduce((total, item) => total + item.quantity, 0),
        selectedTotalPrice: Number(selectedItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)),
        isAllSelected: cartItems.length > 0 && cartItems.every((item) => item.selected)
    };
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
        specs: product.specs
    };
    cartItems = [...cartItems, item];
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
    return { item, capped };
}
function updateCartItemSelection(itemId, selected) {
    var _a;
    const item = (_a = cartItems.find((entry) => entry.id === itemId)) !== null && _a !== void 0 ? _a : null;
    if (item) {
        item.selected = selected;
    }
    return item;
}
function toggleAllCartItems(selected) {
    cartItems = cartItems.map((item) => ({
        ...item,
        selected
    }));
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
    return cartItems;
}
