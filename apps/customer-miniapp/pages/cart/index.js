"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_1 = require("../../src/services/catalog");
const cart_1 = require("../../src/services/cart");
const profile_1 = require("../../src/services/profile");
Page({
    data: {
        items: [],
        itemGroups: [],
        cartCount: 0,
        selectedTotalPrice: 0,
        selectedCount: 0,
        isAllSelected: false,
        canCheckoutSelectedItems: false,
        fulfillmentWarning: '',
        isCheckoutPending: false,
        swipedItemId: '',
        showSpecModal: false,
        editingItem: null,
        editingSpecId: ''
    },
    onShow() {
        this.setData({ isCheckoutPending: false });
        this.refreshCart();
    },
    reconcileItems(nextItems, previousItems) {
        const nextItemsById = new Map(nextItems.map((item) => [item.id, item]));
        const orderedExistingItems = previousItems
            .map((item) => nextItemsById.get(item.id))
            .filter((item) => Boolean(item));
        const previousItemIds = new Set(previousItems.map((item) => item.id));
        const appendedItems = nextItems.filter((item) => !previousItemIds.has(item.id));
        return [...orderedExistingItems, ...appendedItems];
    },
    refreshCart(previousItems) {
        const summary = (0, cart_1.getCartSummary)();
        const nextItems = [...(0, cart_1.getCartItems)()];
        const displayItems = previousItems ? this.reconcileItems(nextItems, previousItems) : nextItems;
        this.setData({
            items: displayItems,
            itemGroups: (0, cart_1.getCartItemGroups)(displayItems),
            cartCount: (0, cart_1.getCartCount)(),
            selectedTotalPrice: summary.selectedTotalPrice,
            selectedCount: summary.selectedCount,
            isAllSelected: summary.isAllSelected,
            canCheckoutSelectedItems: summary.canCheckoutSelectedItems,
            fulfillmentWarning: summary.selectedCount > 0 && !summary.canCheckoutSelectedItems
                ? '请选择支持同一种履约方式的商品一起结算'
                : ''
        });
    },
    handleToggleAll() {
        (0, cart_1.toggleAllCartItems)(!this.data.isAllSelected);
        this.refreshCart();
    },
    handleToggleItem(event) {
        var _a, _b;
        const itemId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.itemId;
        if (!itemId) {
            return;
        }
        const item = (0, cart_1.getCartItemById)(itemId);
        if (!item) {
            return;
        }
        (0, cart_1.updateCartItemSelection)(itemId, !item.selected);
        this.refreshCart();
    },
    handleClearCart() {
        (0, cart_1.clearCart)();
        this.refreshCart();
    },
    handleRemoveItem(event) {
        var _a, _b;
        const itemId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.itemId;
        if (!itemId) {
            return;
        }
        (0, cart_1.removeCartItem)(itemId);
        this.refreshCart();
    },
    handleMinus(event) {
        var _a, _b;
        const itemId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.itemId;
        const item = itemId ? (0, cart_1.getCartItemById)(itemId) : null;
        if (!itemId || !item) {
            return;
        }
        (0, cart_1.updateCartItemQuantity)(itemId, item.quantity - 1);
        this.refreshCart();
    },
    handlePlus(event) {
        var _a, _b;
        const itemId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.itemId;
        const item = itemId ? (0, cart_1.getCartItemById)(itemId) : null;
        if (!itemId || !item) {
            return;
        }
        const result = (0, cart_1.updateCartItemQuantity)(itemId, item.quantity + 1);
        this.refreshCart();
        if (result.capped) {
            wx.showToast({ title: '库存不足', icon: 'none' });
        }
    },
    handleOpenSpecModal(event) {
        var _a, _b;
        const itemId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.itemId;
        const item = itemId ? (0, cart_1.getCartItemById)(itemId) : null;
        if (!item || !item.specs.length) {
            return;
        }
        this.setData({
            showSpecModal: true,
            editingItem: item,
            editingSpecId: item.specId
        });
    },
    handleCloseSpecModal() {
        this.setData({
            showSpecModal: false,
            editingItem: null,
            editingSpecId: ''
        });
    },
    handleEditingSpecTap(event) {
        var _a, _b;
        const specId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.specId;
        if (!specId) {
            return;
        }
        this.setData({ editingSpecId: specId });
    },
    handleConfirmSpec() {
        const editingItem = this.data.editingItem;
        if (!editingItem) {
            return;
        }
        const product = (0, catalog_1.getProductById)(editingItem.productId);
        if (!product) {
            return;
        }
        const previousItems = [...this.data.items];
        const previousIndex = previousItems.findIndex((item) => item.id === editingItem.id);
        const result = (0, cart_1.updateCartItemSpec)(editingItem.id, product, this.data.editingSpecId);
        this.setData({
            swipedItemId: '',
            showSpecModal: false,
            editingItem: null,
            editingSpecId: ''
        });
        if (result.capped && !result.item) {
            wx.showToast({ title: '库存不足，请看看别的吧~', icon: 'none' });
            return;
        }
        if (result.item && result.replacedItemId && previousIndex >= 0) {
            const mergedItem = result.item;
            const reorderedPreviousItems = previousItems.filter((item) => item.id !== mergedItem.id && item.id !== result.replacedItemId);
            reorderedPreviousItems.splice(previousIndex, 0, mergedItem);
            this.refreshCart(reorderedPreviousItems);
            return;
        }
        this.refreshCart(previousItems);
    },
    handleRowSwipeStart(event) {
        var _a, _b, _c;
        const touch = (_b = (_a = event.touches) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : (_c = event.changedTouches) === null || _c === void 0 ? void 0 : _c[0];
        if (typeof (touch === null || touch === void 0 ? void 0 : touch.clientX) !== 'number') {
            return;
        }
        this._swipeStartX = touch.clientX;
    },
    handleRowSwipeMove(event) {
        var _a, _b, _c, _d, _e;
        const itemId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.itemId;
        const touch = (_d = (_c = event.touches) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : (_e = event.changedTouches) === null || _e === void 0 ? void 0 : _e[0];
        if (!itemId || typeof this._swipeStartX !== 'number' || typeof (touch === null || touch === void 0 ? void 0 : touch.clientX) !== 'number') {
            return;
        }
        if (this._swipeStartX - touch.clientX > 48 && this.data.swipedItemId !== itemId) {
            this.setData({ swipedItemId: itemId });
            return;
        }
        if (touch.clientX - this._swipeStartX > 48 && this.data.swipedItemId === itemId) {
            this.setData({ swipedItemId: '' });
        }
    },
    handleRowSwipeEnd() {
        this._swipeStartX = undefined;
    },
    async handleRequestDelete(event) {
        var _a, _b;
        const itemId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.itemId;
        if (!itemId) {
            return;
        }
        const result = await wx.showModal({
            title: '删除商品',
            content: '确认把这个商品从购物车中删除吗？',
            confirmText: '删除',
            confirmColor: '#FF3B30'
        });
        if (!(result === null || result === void 0 ? void 0 : result.confirm)) {
            return;
        }
        (0, cart_1.removeCartItem)(itemId);
        this.setData({ swipedItemId: '' });
        this.refreshCart();
    },
    handleContinueShopping() {
        wx.navigateTo({ url: '/pages/catalog/index' });
    },
    async handleCheckout() {
        if (this.data.isCheckoutPending) {
            return;
        }
        if (!this.data.selectedCount) {
            wx.showToast({ title: '请选择商品', icon: 'none' });
            return;
        }
        if (!this.data.canCheckoutSelectedItems && !(0, cart_1.hasUnverifiedCartItems)()) {
            wx.showToast({ title: '请选择同一履约方式的商品', icon: 'none' });
            return;
        }
        this.setData({ isCheckoutPending: true });
        let shouldUnlock = true;
        try {
            const reconciliation = await (0, cart_1.reconcileCartWithCatalog)();
            this.refreshCart();
            if (!reconciliation.ok) {
                wx.showToast({ title: '商品信息刷新失败，请稍后再试', icon: 'none' });
                return;
            }
            if (reconciliation.hasBlockingChanges) {
                wx.showToast({ title: '购物车商品已更新，请确认后再结算', icon: 'none' });
                return;
            }
            if (!this.data.canCheckoutSelectedItems) {
                wx.showToast({ title: '请选择同一履约方式的商品', icon: 'none' });
                return;
            }
            if (!(0, profile_1.hasBoundPhone)()) {
                try {
                    await (0, profile_1.hydrateProfile)();
                }
                catch (_a) {
                    // Keep the local registration state when profile hydration is unavailable.
                }
            }
            if (!(0, profile_1.hasBoundPhone)()) {
                const result = await wx.showModal({
                    title: '请先完善用户信息',
                    content: '绑定手机号才可以成为我们的会员，享受店内服务。',
                    confirmText: '去完善',
                    cancelText: '稍后再说',
                    confirmColor: '#40535C'
                });
                if (result === null || result === void 0 ? void 0 : result.confirm) {
                    shouldUnlock = false;
                    wx.navigateTo({
                        url: `/pages/profile-detail/index?redirect=${encodeURIComponent('/pages/cart/index')}`
                    });
                }
                return;
            }
            shouldUnlock = false;
            wx.navigateTo({ url: '/pages/checkout/index?source=cart' });
        }
        finally {
            if (shouldUnlock) {
                this.setData({ isCheckoutPending: false });
            }
        }
    }
});
