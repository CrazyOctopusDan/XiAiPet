declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  buildCatalogSections,
  getCatalogCategories,
  getDeliveryModes,
  getProductById,
  getProductDisplayPrice,
  hydrateCatalog
} from '../../src/services/catalog';
import {
  addCartItem,
  getCartCount,
  getCartProductQuantity,
  getCartProductTotalQuantity,
  updateCartProductQuantity
} from '../../src/services/cart';
import type { CatalogProduct, DeliveryMode } from '../../src/types/catalog';
import type { CatalogSection } from '../../src/types/catalog';

type PageProduct = CatalogProduct & { cartQuantity: number };
type PageSection = Omit<CatalogSection, 'availableProducts' | 'soldOutProducts'> & {
  id: string;
  isSoldOutExpanded: boolean;
  availableProducts: PageProduct[];
  soldOutProducts: PageProduct[];
};
type SectionMetric = { categoryId: string; top: number };

interface CatalogPageData {
  deliveryModes: Array<{ id: DeliveryMode; label: string }>;
  activeDeliveryMode: DeliveryMode;
  categories: ReturnType<typeof getCatalogCategories>;
  sections: PageSection[];
  activeCategoryId: string;
  activeSectionSubtitle: string;
  cartCount: number;
  showQuickBuy: boolean;
  selectedProduct: CatalogProduct | null;
  selectedSpecId: string;
  selectedSpecPrice: number;
  quantity: number;
  expandedSoldOutCategoryIds: string[];
  scrollIntoViewTarget: string;
}

interface CatalogPageInstance {
  data: CatalogPageData;
  _currentScrollTop?: number;
  _sectionMetrics?: SectionMetric[];
  setData(data: Record<string, unknown>, callback?: () => void): void;
  refreshSections(mode: DeliveryMode, expandedCategoryIds?: string[]): void;
  syncCartState(): void;
  updateSectionMetrics(): void;
  syncActiveCategory(scrollTop: number): void;
}

function withCartQuantity(product: CatalogProduct): PageProduct {
  return {
    ...product,
    cartQuantity: product.specs.length ? getCartProductTotalQuantity(product.id) : getCartProductQuantity(product.id)
  };
}

function toPageSections(mode: DeliveryMode, expandedCategoryIds: string[]) {
  return buildCatalogSections(mode).map((section) => ({
    ...section,
    id: section.category.id,
    isSoldOutExpanded: expandedCategoryIds.includes(section.category.id),
    availableProducts: section.availableProducts.map(withCartQuantity),
    soldOutProducts: section.soldOutProducts.map(withCartQuantity)
  }));
}

Page({
  data: {
    deliveryModes: getDeliveryModes(),
    activeDeliveryMode: 'delivery',
    categories: getCatalogCategories(),
    sections: toPageSections('delivery', []),
    activeCategoryId: buildCatalogSections('delivery')[0]?.category.id ?? '',
    activeSectionSubtitle: buildCatalogSections('delivery')[0]?.category.sectionTitle ?? '',
    cartCount: getCartCount(),
    showQuickBuy: false,
    selectedProduct: null,
    selectedSpecId: '',
    selectedSpecPrice: 0,
    quantity: 1,
    expandedSoldOutCategoryIds: [],
    scrollIntoViewTarget: ''
  },
  async onLoad(this: CatalogPageInstance) {
    try {
      await hydrateCatalog();
    } catch {
      // Keep the catalog empty when the customer API is unreachable.
    }
    this.refreshSections(this.data.activeDeliveryMode);
  },
  onReady(this: CatalogPageInstance) {
    this.updateSectionMetrics();
  },
  onShow(this: CatalogPageInstance) {
    this.syncCartState();
  },
  refreshSections(this: CatalogPageInstance, mode: DeliveryMode, expandedCategoryIds: string[] = []) {
    const sections = toPageSections(mode, expandedCategoryIds);
    this.setData({
      categories: getCatalogCategories(),
      sections,
      activeDeliveryMode: mode,
      activeCategoryId: sections[0]?.category.id ?? '',
      activeSectionSubtitle: sections[0]?.category.sectionTitle ?? '',
      scrollIntoViewTarget: ''
    }, () => {
      this._currentScrollTop = 0;
      this.updateSectionMetrics();
    });
  },
  syncCartState(this: CatalogPageInstance) {
    const sections = toPageSections(this.data.activeDeliveryMode, this.data.expandedSoldOutCategoryIds);
    this.setData({
      cartCount: getCartCount(),
      categories: getCatalogCategories(),
      sections,
      activeCategoryId: sections.some((section) => section.category.id === this.data.activeCategoryId)
        ? this.data.activeCategoryId
        : sections[0]?.category.id ?? '',
      activeSectionSubtitle:
        sections.find((section) => section.category.id === this.data.activeCategoryId)?.category.sectionTitle ??
        sections[0]?.category.sectionTitle ??
        ''
    }, () => {
      this.updateSectionMetrics();
    });
  },
  updateSectionMetrics(this: CatalogPageInstance) {
    const query = wx.createSelectorQuery();
    query.select('.product-column').boundingClientRect();
    query.selectAll('.product-section').boundingClientRect();
    query.exec((result: Array<{ top?: number }[] | { top?: number } | null>) => {
      const containerRect = result?.[0] as { top?: number } | null;
      const sectionRects = (result?.[1] as Array<{ top?: number }> | null) ?? [];

      if (!containerRect || !sectionRects.length) {
        this._sectionMetrics = [];
        return;
      }

      const baseScrollTop = this._currentScrollTop ?? 0;
      this._sectionMetrics = sectionRects.map((rect, index) => ({
        categoryId: this.data.sections[index]?.category.id ?? '',
        top: Math.max(0, (rect.top ?? 0) - (containerRect.top ?? 0) + baseScrollTop)
      }));
    });
  },
  syncActiveCategory(this: CatalogPageInstance, scrollTop: number) {
    this._currentScrollTop = scrollTop;

    if (!this._sectionMetrics?.length) {
      return;
    }

    let nextCategoryId = this._sectionMetrics[0]?.categoryId ?? this.data.activeCategoryId;

    this._sectionMetrics.forEach((metric) => {
      if (scrollTop + 120 >= metric.top) {
        nextCategoryId = metric.categoryId;
      }
    });

    if (!nextCategoryId || nextCategoryId === this.data.activeCategoryId) {
      return;
    }

    const activeSection = this.data.sections.find((section) => section.category.id === nextCategoryId);
    this.setData({
      activeCategoryId: nextCategoryId,
      activeSectionSubtitle: activeSection?.category.sectionTitle ?? ''
    });
  },
  handleDeliveryModeTap(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { mode?: DeliveryMode } } }) {
    const nextMode = event.currentTarget?.dataset?.mode;

    if (!nextMode || nextMode === this.data.activeDeliveryMode) {
      return;
    }

    this.refreshSections(nextMode);
  },
  handleCategoryTap(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { categoryId?: string } } }) {
    const categoryId = event.currentTarget?.dataset?.categoryId;

    if (!categoryId) {
      return;
    }

    this.setData({
      activeCategoryId: categoryId,
      activeSectionSubtitle: this.data.sections.find((section) => section.category.id === categoryId)?.category.sectionTitle ?? '',
      scrollIntoViewTarget: `section-${categoryId}`
    });
  },
  handleProductScroll(this: CatalogPageInstance, event: { detail?: { scrollTop?: number } }) {
    this.syncActiveCategory(event.detail?.scrollTop ?? 0);
  },
  handleSearchTap() {
    wx.navigateTo({
      url: '/pages/search/index'
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
  handleDirectAdd(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { productId?: string } } }) {
    const productId = event.currentTarget?.dataset?.productId;
    const product = productId ? getProductById(productId) : null;

    if (!product || product.soldOut) {
      wx.showToast({ title: '库存不足', icon: 'none' });
      return;
    }

    const result = addCartItem(product, '', 1);
    this.syncCartState();
    wx.showToast({ title: result.capped ? '库存不足' : '已加入购物车', icon: 'none' });
  },
  handleDirectMinus(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { productId?: string } } }) {
    const productId = event.currentTarget?.dataset?.productId;

    if (!productId) {
      return;
    }

    const nextQuantity = Math.max(0, getCartProductQuantity(productId) - 1);
    updateCartProductQuantity(productId, '', nextQuantity);
    this.syncCartState();
  },
  handleActionTap() {},
  handleMaskTouchMove() {},
  handleQuickBuyOpen(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { productId?: string } } }) {
    const productId = event.currentTarget?.dataset?.productId;
    const product = productId ? getProductById(productId) : null;

    if (!product) {
      return;
    }

    this.setData({
      showQuickBuy: true,
      selectedProduct: product,
      selectedSpecId: product.specs[0]?.id ?? '',
      selectedSpecPrice: getProductDisplayPrice(product, product.specs[0]?.id ?? ''),
      quantity: 1
    });
  },
  handleQuickBuyClose(this: CatalogPageInstance) {
    this.setData({
      showQuickBuy: false,
      selectedProduct: null,
      selectedSpecId: '',
      selectedSpecPrice: 0,
      quantity: 1
    });
  },
  handleSpecTap(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { specId?: string } } }) {
    const specId = event.currentTarget?.dataset?.specId;

    if (!specId || !this.data.selectedProduct) {
      return;
    }

    this.setData({
      selectedSpecId: specId,
      selectedSpecPrice: getProductDisplayPrice(this.data.selectedProduct, specId)
    });
  },
  handleQuantityMinus(this: CatalogPageInstance) {
    this.setData({ quantity: Math.max(1, this.data.quantity - 1) });
  },
  handleQuantityPlus(this: CatalogPageInstance) {
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
  handleConfirmQuickBuy(this: CatalogPageInstance) {
    if (!this.data.selectedProduct) {
      return;
    }

    const result = addCartItem(this.data.selectedProduct, this.data.selectedSpecId, this.data.quantity);

    this.setData({
      cartCount: getCartCount(),
      sections: this.data.sections.map((section) => ({
        ...section,
        availableProducts: section.availableProducts.map(withCartQuantity),
        soldOutProducts: section.soldOutProducts.map(withCartQuantity)
      })),
      showQuickBuy: false,
      selectedProduct: null,
      selectedSpecId: '',
      selectedSpecPrice: 0,
      quantity: 1
    });
    wx.showToast({ title: result.capped ? '库存不足' : '已加入购物车', icon: 'none' });
  },
  handleToggleSoldOut(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { categoryId?: string } } }) {
    const categoryId = event.currentTarget?.dataset?.categoryId;

    if (!categoryId) {
      return;
    }

    const expanded = this.data.expandedSoldOutCategoryIds.includes(categoryId)
      ? this.data.expandedSoldOutCategoryIds.filter((id) => id !== categoryId)
      : [...this.data.expandedSoldOutCategoryIds, categoryId];

    this.setData({ expandedSoldOutCategoryIds: expanded });
    this.refreshSections(this.data.activeDeliveryMode, expanded);
  },
  handleCartTap() {
    wx.navigateTo({ url: '/pages/cart/index' });
  }
});
