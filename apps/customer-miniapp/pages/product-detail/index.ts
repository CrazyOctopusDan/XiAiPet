declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  addCartItem,
  getCartCount
} from '../../src/services/cart';
import {
  getProductById,
  getProductDisplayPrice,
  getProductSelectedSpecLabel
} from '../../src/services/catalog';
import type { CatalogProduct } from '../../src/types/catalog';

interface ProductDetailPageData {
  product: CatalogProduct | null;
  selectedSpecId: string;
  selectedSpecLabel: string;
  selectedPrice: number;
  quantity: number;
  cartCount: number;
  swiperIndex: number;
  isAddToCartDisabled: boolean;
}

interface ProductDetailPageInstance {
  data: ProductDetailPageData;
  setData(data: Record<string, unknown>, callback?: () => void): void;
  syncCartCount(): void;
}

function requiresSpecSelection(product: CatalogProduct | null) {
  return Boolean(product?.specs.length);
}

function resolveSelectedSpecLabel(product: CatalogProduct | null, specId: string) {
  if (!product) {
    return '';
  }

  if (!requiresSpecSelection(product)) {
    return product.summary || '默认规格';
  }

  if (!specId) {
    return '请选择规格信息';
  }

  return getProductSelectedSpecLabel(product, specId);
}

function resolveAddToCartDisabled(product: CatalogProduct | null, specId: string) {
  if (!product || product.soldOut) {
    return true;
  }

  return requiresSpecSelection(product) && !specId;
}

Page({
  data: {
    product: null,
    selectedSpecId: '',
    selectedSpecLabel: '',
    selectedPrice: 0,
    quantity: 1,
    cartCount: getCartCount(),
    swiperIndex: 1,
    isAddToCartDisabled: true
  },
  onLoad(this: ProductDetailPageInstance, query: { productId?: string }) {
    const product = query.productId ? getProductById(query.productId) : null;
    const selectedSpecId = '';

    this.setData({
      product,
      selectedSpecId,
      selectedSpecLabel: resolveSelectedSpecLabel(product, selectedSpecId),
      selectedPrice: product ? getProductDisplayPrice(product, selectedSpecId) : 0,
      quantity: 1,
      cartCount: getCartCount(),
      swiperIndex: 1,
      isAddToCartDisabled: resolveAddToCartDisabled(product, selectedSpecId)
    });
  },
  onShow(this: ProductDetailPageInstance) {
    this.syncCartCount();
  },
  syncCartCount(this: ProductDetailPageInstance) {
    this.setData({
      cartCount: getCartCount()
    });
  },
  handleSpecTap(this: ProductDetailPageInstance, event: { currentTarget?: { dataset?: { specId?: string } } }) {
    const specId = event.currentTarget?.dataset?.specId;

    if (!specId) {
      return;
    }

    if (!this.data.product) {
      return;
    }

    this.setData({
      selectedSpecId: specId,
      selectedSpecLabel: resolveSelectedSpecLabel(this.data.product, specId),
      selectedPrice: getProductDisplayPrice(this.data.product, specId),
      isAddToCartDisabled: resolveAddToCartDisabled(this.data.product, specId)
    });
  },
  handleSwiperChange(this: ProductDetailPageInstance, event: { detail?: { current?: number } }) {
    this.setData({ swiperIndex: (event.detail?.current ?? 0) + 1 });
  },
  handleMinus(this: ProductDetailPageInstance) {
    if (this.data.quantity <= 1) {
      return;
    }

    this.setData({ quantity: this.data.quantity - 1 });
  },
  handlePlus(this: ProductDetailPageInstance) {
    if (!this.data.product) {
      return;
    }

    if (this.data.quantity >= this.data.product.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' });
      return;
    }

    this.setData({ quantity: this.data.quantity + 1 });
  },
  handleAddToCart(this: ProductDetailPageInstance) {
    if (!this.data.product) {
      return;
    }

    if (this.data.product.soldOut) {
      wx.showToast({ title: '库存不足', icon: 'none' });
      return;
    }

    if (requiresSpecSelection(this.data.product) && !this.data.selectedSpecId) {
      wx.showToast({ title: '请先选择规格信息', icon: 'none' });
      return;
    }

    const result = addCartItem(
      this.data.product,
      this.data.selectedSpecId,
      this.data.quantity
    );
    this.syncCartCount();
    wx.showToast({ title: result.capped ? '库存不足' : '已加入购物车', icon: 'none' });
  },
  handleShareTap() {
    wx.showShareMenu({
      withShareTicket: true
    });
    wx.showToast({ title: '已打开分享面板', icon: 'none' });
  },
  handleCartTap() {
    wx.navigateTo({ url: '/pages/cart/index' });
  },
  onShareAppMessage() {
    const product = (this as unknown as { data: ProductDetailPageData }).data.product;

    return {
      title: product?.name ?? 'Paws Only 商品详情',
      path: `/pages/product-detail/index?productId=${product?.id ?? ''}`
    };
  }
});
