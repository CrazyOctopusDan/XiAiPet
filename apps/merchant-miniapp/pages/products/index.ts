declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  getProductPageViewModel,
  queryCategories,
  queryProducts
} from '../../src/services/catalog-admin';

interface ProductsPageData {
  loading: boolean;
  isEmpty: boolean;
  activeCategoryId: string;
  draftKeyword: string;
  keyword: string;
  categoryFilters: ReturnType<typeof getProductPageViewModel>['categoryFilters'];
  cards: ReturnType<typeof getProductPageViewModel>['cards'];
}

interface ProductsPageInstance {
  data: ProductsPageData;
  setData(updates: Record<string, unknown>): void;
  refreshProducts(): Promise<void>;
}

Page({
  data: {
    loading: true,
    isEmpty: true,
    activeCategoryId: '',
    draftKeyword: '',
    keyword: '',
    categoryFilters: [],
    cards: []
  },
  onLoad(this: ProductsPageInstance, options?: { categoryId?: string }) {
    this.setData({
      activeCategoryId: options?.categoryId ?? ''
    });
  },
  async onShow(this: ProductsPageInstance) {
    await this.refreshProducts();
  },
  async refreshProducts(this: ProductsPageInstance) {
    this.setData({ loading: true });

    const categories = await queryCategories();
    const products = await queryProducts(this.data.activeCategoryId);
    const view = getProductPageViewModel(products, categories, this.data.activeCategoryId, this.data.keyword);

    this.setData({
      loading: false,
      isEmpty: view.isEmpty,
      categoryFilters: view.categoryFilters,
      cards: view.cards
    });
  },
  handleCategoryTap(this: ProductsPageInstance, event: { currentTarget?: { dataset?: { id?: string } } }) {
    this.setData({
      activeCategoryId: event.currentTarget?.dataset?.id ?? ''
    });
    void this.refreshProducts();
  },
  handleKeywordInput(this: ProductsPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      draftKeyword: event.detail?.value ?? ''
    });
  },
  handleKeywordConfirm(this: ProductsPageInstance) {
    this.setData({
      keyword: this.data.draftKeyword.trim()
    });
    void this.refreshProducts();
  },
  handleCreateTap(this: ProductsPageInstance) {
    wx.navigateTo({
      url: `/pages/product-editor/index?categoryId=${this.data.activeCategoryId}`
    });
  },
  handleEditTap(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const productId = event.currentTarget?.dataset?.id ?? '';
    wx.navigateTo({
      url: `/pages/product-editor/index?productId=${productId}`
    });
  }
});
