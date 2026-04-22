declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  addCartItem,
  getCartCount,
  getCartProductQuantity,
  getCartProductTotalQuantity,
  updateCartProductQuantity
} from '../../src/services/cart';
import { getProductById, getProductDisplayPrice, searchProducts } from '../../src/services/catalog';
import type { CatalogProduct } from '../../src/types/catalog';

let searchTimer: ReturnType<typeof setTimeout> | null = null;

type SearchResult = CatalogProduct & { cartQuantity: number };

interface SearchPageInstance {
  data: {
    keyword: string;
    results: SearchResult[];
    hasSearched: boolean;
    cartCount: number;
    showQuickBuy: boolean;
    selectedProduct: CatalogProduct | null;
    selectedSpecId: string;
    selectedSpecPrice: number;
    quantity: number;
  };
  setData(data: Record<string, unknown>, callback?: () => void): void;
  commitResults(keyword: string): void;
}

function withCartQuantity(product: CatalogProduct): SearchResult {
  return {
    ...product,
    cartQuantity: product.specs.length ? getCartProductTotalQuantity(product.id) : getCartProductQuantity(product.id)
  };
}

Page({
  data: {
    keyword: '',
    results: [],
    hasSearched: false,
    cartCount: getCartCount(),
    showQuickBuy: false,
    selectedProduct: null,
    selectedSpecId: '',
    selectedSpecPrice: 0,
    quantity: 1
  },
  onShow(this: SearchPageInstance) {
    this.setData({
      cartCount: getCartCount(),
      results: this.data.results.map(withCartQuantity)
    });
  },
  onUnload() {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
  },
  handleCancelTap() {
    wx.navigateBack();
  },
  handleKeywordInput(this: SearchPageInstance, event: { detail?: { value?: string } }) {
    const keyword = event.detail?.value ?? '';
    this.setData({ keyword });

    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    if (!keyword.trim()) {
      this.setData({
        hasSearched: false,
        results: []
      });
      return;
    }

    searchTimer = setTimeout(() => {
      this.commitResults(keyword);
    }, 180);
  },
  commitResults(this: SearchPageInstance, keyword: string) {
    this.setData({
      hasSearched: true,
      results: searchProducts(keyword).map(withCartQuantity)
    });
  },
  handleProductTap(event: { currentTarget?: { dataset?: { productId?: string } } }) {
    const productId = event.currentTarget?.dataset?.productId;

    if (!productId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/product-detail/index?productId=${productId}`
    });
  },
  handleAdd(
    this: SearchPageInstance,
    event: { currentTarget?: { dataset?: { productId?: string; soldOut?: boolean; hasSpec?: boolean } } }
  ) {
    const productId = event.currentTarget?.dataset?.productId;
    const product = productId ? getProductById(productId) : null;

    if (event.currentTarget?.dataset?.soldOut) {
      wx.showToast({ title: '库存不足', icon: 'none' });
      return;
    }

    if (!product) {
      return;
    }

    if (event.currentTarget?.dataset?.hasSpec) {
      this.setData({
        showQuickBuy: true,
        selectedProduct: product,
        selectedSpecId: product.specs[0]?.id ?? '',
        selectedSpecPrice: getProductDisplayPrice(product, product.specs[0]?.id ?? ''),
        quantity: 1
      });
      return;
    }

    const result = addCartItem(product, '', 1);
    wx.showToast({ title: result.capped ? '库存不足' : '已加入购物车', icon: 'none' });
    this.setData({
      cartCount: getCartCount(),
      results: this.data.results.map(withCartQuantity)
    });
  },
  handleMinus(this: SearchPageInstance, event: { currentTarget?: { dataset?: { productId?: string } } }) {
    const productId = event.currentTarget?.dataset?.productId;

    if (!productId) {
      return;
    }

    updateCartProductQuantity(productId, '', Math.max(0, getCartProductQuantity(productId) - 1));
    this.setData({
      cartCount: getCartCount(),
      results: this.data.results.map(withCartQuantity)
    });
  },
  handleActionTap() {
    return;
  },
  handleMaskTouchMove() {
    return;
  },
  handleQuickBuyClose(this: SearchPageInstance) {
    this.setData({
      showQuickBuy: false,
      selectedProduct: null,
      selectedSpecId: '',
      selectedSpecPrice: 0,
      quantity: 1
    });
  },
  handleSpecTap(this: SearchPageInstance, event: { currentTarget?: { dataset?: { specId?: string } } }) {
    const specId = event.currentTarget?.dataset?.specId;

    if (!specId || !this.data.selectedProduct) {
      return;
    }

    this.setData({
      selectedSpecId: specId,
      selectedSpecPrice: getProductDisplayPrice(this.data.selectedProduct, specId)
    });
  },
  handleQuantityMinus(this: SearchPageInstance) {
    this.setData({ quantity: Math.max(1, this.data.quantity - 1) });
  },
  handleQuantityPlus(this: SearchPageInstance) {
    const product = this.data.selectedProduct;

    if (!product) {
      return;
    }

    if (this.data.quantity >= product.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' });
      return;
    }

    this.setData({ quantity: this.data.quantity + 1 });
  },
  handleConfirmQuickBuy(this: SearchPageInstance) {
    if (!this.data.selectedProduct) {
      return;
    }

    const result = addCartItem(this.data.selectedProduct, this.data.selectedSpecId, this.data.quantity);
    this.setData({
      cartCount: getCartCount(),
      results: this.data.results.map(withCartQuantity),
      showQuickBuy: false,
      selectedProduct: null,
      selectedSpecId: '',
      selectedSpecPrice: 0,
      quantity: 1
    });
    wx.showToast({ title: result.capped ? '库存不足' : '已加入购物车', icon: 'none' });
  }
});
