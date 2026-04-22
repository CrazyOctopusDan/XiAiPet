declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getProductById } from '../../src/services/catalog';
import {
  clearCart,
  getCartCount,
  getCartItemById,
  getCartItems,
  getCartSummary,
  removeCartItem,
  toggleAllCartItems,
  updateCartItemQuantity,
  updateCartItemSelection,
  updateCartItemSpec,
  type CartItem
} from '../../src/services/cart';

interface CartPageData {
  items: CartItem[];
  cartCount: number;
  selectedTotalPrice: number;
  selectedCount: number;
  isAllSelected: boolean;
  swipedItemId: string;
  showSpecModal: boolean;
  editingItem: CartItem | null;
  editingSpecId: string;
}

interface CartPageInstance {
  data: CartPageData;
  _swipeStartX?: number;
  setData(data: Record<string, unknown>): void;
  refreshCart(previousItems?: CartItem[]): void;
  reconcileItems(nextItems: CartItem[], previousItems: CartItem[]): CartItem[];
}

Page({
  data: {
    items: [],
    cartCount: 0,
    selectedTotalPrice: 0,
    selectedCount: 0,
    isAllSelected: false,
    swipedItemId: '',
    showSpecModal: false,
    editingItem: null,
    editingSpecId: ''
  },
  onShow(this: CartPageInstance) {
    this.refreshCart();
  },
  reconcileItems(this: CartPageInstance, nextItems: CartItem[], previousItems: CartItem[]) {
    const nextItemsById = new Map(nextItems.map((item) => [item.id, item]));
    const orderedExistingItems = previousItems
      .map((item) => nextItemsById.get(item.id))
      .filter((item): item is CartItem => Boolean(item));
    const previousItemIds = new Set(previousItems.map((item) => item.id));
    const appendedItems = nextItems.filter((item) => !previousItemIds.has(item.id));

    return [...orderedExistingItems, ...appendedItems];
  },
  refreshCart(this: CartPageInstance, previousItems?: CartItem[]) {
    const summary = getCartSummary();
    const nextItems = [...getCartItems()];
    this.setData({
      items: previousItems ? this.reconcileItems(nextItems, previousItems) : nextItems,
      cartCount: getCartCount(),
      selectedTotalPrice: summary.selectedTotalPrice,
      selectedCount: summary.selectedCount,
      isAllSelected: summary.isAllSelected
    });
  },
  handleToggleAll(this: CartPageInstance) {
    toggleAllCartItems(!this.data.isAllSelected);
    this.refreshCart();
  },
  handleToggleItem(this: CartPageInstance, event: { currentTarget?: { dataset?: { itemId?: string } } }) {
    const itemId = event.currentTarget?.dataset?.itemId;

    if (!itemId) {
      return;
    }

    const item = getCartItemById(itemId);
    if (!item) {
      return;
    }

    updateCartItemSelection(itemId, !item.selected);
    this.refreshCart();
  },
  handleClearCart(this: CartPageInstance) {
    clearCart();
    this.refreshCart();
  },
  handleRemoveItem(this: CartPageInstance, event: { currentTarget?: { dataset?: { itemId?: string } } }) {
    const itemId = event.currentTarget?.dataset?.itemId;

    if (!itemId) {
      return;
    }

    removeCartItem(itemId);
    this.refreshCart();
  },
  handleMinus(this: CartPageInstance, event: { currentTarget?: { dataset?: { itemId?: string } } }) {
    const itemId = event.currentTarget?.dataset?.itemId;
    const item = itemId ? getCartItemById(itemId) : null;

    if (!itemId || !item) {
      return;
    }

    updateCartItemQuantity(itemId, item.quantity - 1);
    this.refreshCart();
  },
  handlePlus(this: CartPageInstance, event: { currentTarget?: { dataset?: { itemId?: string } } }) {
    const itemId = event.currentTarget?.dataset?.itemId;
    const item = itemId ? getCartItemById(itemId) : null;

    if (!itemId || !item) {
      return;
    }

    const result = updateCartItemQuantity(itemId, item.quantity + 1);
    this.refreshCart();

    if (result.capped) {
      wx.showToast({ title: '库存不足', icon: 'none' });
    }
  },
  handleOpenSpecModal(this: CartPageInstance, event: { currentTarget?: { dataset?: { itemId?: string } } }) {
    const itemId = event.currentTarget?.dataset?.itemId;
    const item = itemId ? getCartItemById(itemId) : null;

    if (!item || !item.specs.length) {
      return;
    }

    this.setData({
      showSpecModal: true,
      editingItem: item,
      editingSpecId: item.specId
    });
  },
  handleCloseSpecModal(this: CartPageInstance) {
    this.setData({
      showSpecModal: false,
      editingItem: null,
      editingSpecId: ''
    });
  },
  handleEditingSpecTap(this: CartPageInstance, event: { currentTarget?: { dataset?: { specId?: string } } }) {
    const specId = event.currentTarget?.dataset?.specId;

    if (!specId) {
      return;
    }

    this.setData({ editingSpecId: specId });
  },
  handleConfirmSpec(this: CartPageInstance) {
    const editingItem = this.data.editingItem;

    if (!editingItem) {
      return;
    }

    const product = getProductById(editingItem.productId);
    if (!product) {
      return;
    }

    const previousItems = [...this.data.items];
    const previousIndex = previousItems.findIndex((item) => item.id === editingItem.id);
    const result = updateCartItemSpec(editingItem.id, product, this.data.editingSpecId);
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
      const reorderedPreviousItems = previousItems.filter(
        (item) => item.id !== mergedItem.id && item.id !== result.replacedItemId
      );
      reorderedPreviousItems.splice(previousIndex, 0, mergedItem);
      this.refreshCart(reorderedPreviousItems);
      return;
    }

    this.refreshCart(previousItems);
  },
  handleRowSwipeStart(
    this: CartPageInstance,
    event: { touches?: Array<{ clientX?: number }>; changedTouches?: Array<{ clientX?: number }> }
  ) {
    const touch = event.touches?.[0] ?? event.changedTouches?.[0];

    if (typeof touch?.clientX !== 'number') {
      return;
    }

    this._swipeStartX = touch.clientX;
  },
  handleRowSwipeMove(
    this: CartPageInstance,
    event: {
      currentTarget?: { dataset?: { itemId?: string } };
      touches?: Array<{ clientX?: number }>;
      changedTouches?: Array<{ clientX?: number }>;
    }
  ) {
    const itemId = event.currentTarget?.dataset?.itemId;
    const touch = event.touches?.[0] ?? event.changedTouches?.[0];

    if (!itemId || typeof this._swipeStartX !== 'number' || typeof touch?.clientX !== 'number') {
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
  handleRowSwipeEnd(this: CartPageInstance) {
    this._swipeStartX = undefined;
  },
  async handleRequestDelete(
    this: CartPageInstance,
    event: { currentTarget?: { dataset?: { itemId?: string } } }
  ) {
    const itemId = event.currentTarget?.dataset?.itemId;

    if (!itemId) {
      return;
    }

    const result = await wx.showModal({
      title: '删除商品',
      content: '确认把这个商品从购物车中删除吗？',
      confirmText: '删除',
      confirmColor: '#FF3B30'
    });

    if (!result?.confirm) {
      return;
    }

    removeCartItem(itemId);
    this.setData({ swipedItemId: '' });
    this.refreshCart();
  },
  handleContinueShopping() {
    wx.navigateTo({ url: '/pages/catalog/index' });
  },
  handleCheckout(this: CartPageInstance) {
    if (!this.data.selectedCount) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    wx.navigateTo({ url: '/pages/checkout/index?source=cart' });
  }
});
