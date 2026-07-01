declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  deleteProduct,
  getProductPageViewModel,
  type ProductListSource,
  queryCategories,
  queryProducts,
  reorderProducts
} from '../../src/services/catalog-admin';
import type { CatalogPageInfo } from '@xiaipet/shared/types/catalog-admin';

const PRODUCT_PAGE_LIMIT = 100;

interface ProductsPageData {
  loading: boolean;
  isReordering: boolean;
  isEmpty: boolean;
  activeCategoryId: string;
  statusFilter: string;
  sort: string;
  draftKeyword: string;
  keyword: string;
  swipedProductId: string;
  pageInfo: CatalogPageInfo;
  snapshotKey: string;
  isLoadingMore: boolean;
  products: ProductListSource[];
  categoryFilters: ReturnType<typeof getProductPageViewModel>['categoryFilters'];
  cards: ReturnType<typeof getProductPageViewModel>['cards'];
  summary: ReturnType<typeof getProductPageViewModel>['summary'];
}

interface ProductsPageInstance {
  data: ProductsPageData;
  productTouchStartX: number;
  setData(updates: Record<string, unknown>): void;
  refreshProducts(): Promise<void>;
  handleLoadMoreProducts(): Promise<void>;
}

function defaultPageInfo(): CatalogPageInfo {
  return { hasMore: false, nextCursor: null };
}

Page({
  data: {
    loading: true,
    isReordering: false,
    isEmpty: true,
    activeCategoryId: '',
    statusFilter: '',
    sort: '',
    draftKeyword: '',
    keyword: '',
    swipedProductId: '',
    pageInfo: defaultPageInfo(),
    snapshotKey: '',
    isLoadingMore: false,
    products: [],
    categoryFilters: [],
    cards: [],
    summary: {
      totalProducts: 0,
      publishedProducts: 0,
      stockWarnings: 0
    }
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

    try {
      const [categories, productsResponse] = await Promise.all([
        queryCategories(),
        queryProducts({
          categoryId: this.data.activeCategoryId,
          status: this.data.statusFilter,
          keyword: this.data.keyword,
          sort: this.data.sort,
          limit: PRODUCT_PAGE_LIMIT
        })
      ]);
      const view = getProductPageViewModel(
        productsResponse.items,
        categories,
        this.data.activeCategoryId,
        '',
        productsResponse.summary
      );

      this.setData({
        loading: false,
        isEmpty: view.isEmpty,
        products: productsResponse.items,
        summary: view.summary,
        categoryFilters: view.categoryFilters,
        cards: view.cards,
        pageInfo: productsResponse.pageInfo,
        snapshotKey: productsResponse.snapshotKey,
        swipedProductId: ''
      });
    } catch {
      this.setData({ loading: false });
      wx.showToast({
        title: '商品加载失败',
        icon: 'none'
      });
    }
  },
  handleCategoryTap(this: ProductsPageInstance, event: { currentTarget?: { dataset?: { id?: string } } }) {
    this.setData({
      activeCategoryId: event.currentTarget?.dataset?.id ?? ''
    });
    void this.refreshProducts();
  },
  handleStatusFilterTap(this: ProductsPageInstance, event: { currentTarget?: { dataset?: { status?: string } } }) {
    this.setData({
      statusFilter: event.currentTarget?.dataset?.status ?? ''
    });
    void this.refreshProducts();
  },
  handleSortTap(this: ProductsPageInstance, event: { currentTarget?: { dataset?: { sort?: string } } }) {
    this.setData({
      sort: event.currentTarget?.dataset?.sort ?? 'latest'
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
  handleClearSearch(this: ProductsPageInstance) {
    this.setData({
      draftKeyword: '',
      keyword: ''
    });
    void this.refreshProducts();
  },
  async handleLoadMoreProducts(this: ProductsPageInstance) {
    if (!this.data.pageInfo.hasMore || this.data.isLoadingMore) {
      return;
    }

    this.setData({ isLoadingMore: true });

    try {
      const productsResponse = await queryProducts({
        categoryId: this.data.activeCategoryId,
        status: this.data.statusFilter,
        keyword: this.data.keyword,
        sort: this.data.sort,
        limit: PRODUCT_PAGE_LIMIT,
        cursor: this.data.pageInfo.nextCursor ?? undefined
      });
      const view = getProductPageViewModel(
        productsResponse.items,
        [],
        this.data.activeCategoryId,
        '',
        productsResponse.summary
      );

      this.setData({
        isLoadingMore: false,
        isEmpty: false,
        products: [...this.data.products, ...productsResponse.items],
        summary: view.summary,
        cards: [...this.data.cards, ...view.cards],
        pageInfo: productsResponse.pageInfo,
        snapshotKey: productsResponse.snapshotKey,
        swipedProductId: ''
      });
    } catch {
      this.setData({ isLoadingMore: false });
      wx.showToast({
        title: '商品加载失败',
        icon: 'none'
      });
    }
  },
  handleCreateTap(this: ProductsPageInstance) {
    wx.navigateTo({
      url: `/pages/product-editor/index?categoryId=${this.data.activeCategoryId}`
    });
  },
  handleEditTap(this: ProductsPageInstance, event: { currentTarget?: { dataset?: { id?: string } } }) {
    const productId = event.currentTarget?.dataset?.id ?? '';
    this.setData({ swipedProductId: '' });
    wx.navigateTo({
      url: `/pages/product-editor/index?productId=${productId}`
    });
  },
  handleProductTouchStart(this: ProductsPageInstance, event: { touches?: Array<{ clientX?: number }> }) {
    this.productTouchStartX = event.touches?.[0]?.clientX ?? 0;
  },
  handleProductTouchEnd(
    this: ProductsPageInstance,
    event: {
      currentTarget?: { dataset?: { id?: string } };
      changedTouches?: Array<{ clientX?: number }>;
    }
  ) {
    const productId = event.currentTarget?.dataset?.id ?? '';
    const endX = event.changedTouches?.[0]?.clientX ?? this.productTouchStartX;
    const deltaX = endX - this.productTouchStartX;

    if (!productId || Math.abs(deltaX) < 36) {
      return;
    }

    this.setData({
      swipedProductId: deltaX < 0 ? productId : ''
    });
  },
  async handleMoveProductTap(
    this: ProductsPageInstance,
    event: { currentTarget?: { dataset?: { id?: string; direction?: 'up' | 'down' } } }
  ) {
    if (this.data.isReordering) {
      return;
    }

    if (this.data.pageInfo.hasMore) {
      wx.showToast({
        title: '请先加载全部商品',
        icon: 'none'
      });
      return;
    }

    const productId = event.currentTarget?.dataset?.id;
    const direction = event.currentTarget?.dataset?.direction;
    const currentIndex = this.data.products.findIndex((product) => product.id === productId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (!productId || currentIndex < 0 || targetIndex < 0 || targetIndex >= this.data.products.length) {
      return;
    }

    const nextProducts = [...this.data.products];
    const [movedProduct] = nextProducts.splice(currentIndex, 1);
    nextProducts.splice(targetIndex, 0, movedProduct);

    this.setData({ isReordering: true, swipedProductId: '' });
    try {
      const products = await reorderProducts(nextProducts);
      const view = getProductPageViewModel(products, [], this.data.activeCategoryId, this.data.keyword);
      this.setData({
        isReordering: false,
        products,
        isEmpty: view.isEmpty,
        cards: view.cards,
        summary: view.summary
      });
      wx.showToast({
        title: '排序已保存',
        icon: 'success'
      });
    } catch {
      this.setData({ isReordering: false });
      wx.showToast({
        title: '排序保存失败',
        icon: 'none'
      });
      await this.refreshProducts();
    }
  },
  handleDeleteTap(
    this: ProductsPageInstance,
    event: { currentTarget?: { dataset?: { id?: string; name?: string } } }
  ) {
    const productId = event.currentTarget?.dataset?.id ?? '';
    const productName = event.currentTarget?.dataset?.name ?? '当前商品';

    if (!productId) {
      return;
    }

    wx.showModal({
      title: '删除商品',
      content: `确认删除 ${productName}？删除后用户端将不再展示该商品。`,
      confirmText: '删除',
      confirmColor: '#B6463A',
      success: async (result: { confirm?: boolean }) => {
        if (!result.confirm) {
          this.setData({ swipedProductId: '' });
          return;
        }

        try {
          await deleteProduct(productId);
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
          this.setData({ swipedProductId: '' });
          await this.refreshProducts();
        } catch (error) {
          wx.showToast({
            title: '删除失败',
            icon: 'none'
          });
        }
      }
    });
  }
});
