"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_admin_1 = require("../../src/services/catalog-admin");
const PRODUCT_PAGE_LIMIT = 100;
function defaultPageInfo() {
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
    onLoad(options) {
        var _a;
        this.setData({
            activeCategoryId: (_a = options === null || options === void 0 ? void 0 : options.categoryId) !== null && _a !== void 0 ? _a : ''
        });
    },
    async onShow() {
        await this.refreshProducts();
    },
    async refreshProducts() {
        this.setData({ loading: true });
        try {
            const [categories, productsResponse] = await Promise.all([
                (0, catalog_admin_1.queryCategories)(),
                (0, catalog_admin_1.queryProducts)({
                    categoryId: this.data.activeCategoryId,
                    status: this.data.statusFilter,
                    keyword: this.data.keyword,
                    sort: this.data.sort,
                    limit: PRODUCT_PAGE_LIMIT
                })
            ]);
            const view = (0, catalog_admin_1.getProductPageViewModel)(productsResponse.items, categories, this.data.activeCategoryId, '', productsResponse.summary);
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
        }
        catch (_a) {
            this.setData({ loading: false });
            wx.showToast({
                title: '商品加载失败',
                icon: 'none'
            });
        }
    },
    handleCategoryTap(event) {
        var _a, _b, _c;
        this.setData({
            activeCategoryId: (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : ''
        });
        void this.refreshProducts();
    },
    handleStatusFilterTap(event) {
        var _a, _b, _c;
        this.setData({
            statusFilter: (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.status) !== null && _c !== void 0 ? _c : ''
        });
        void this.refreshProducts();
    },
    handleSortTap(event) {
        var _a, _b, _c;
        this.setData({
            sort: (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.sort) !== null && _c !== void 0 ? _c : 'latest'
        });
        void this.refreshProducts();
    },
    handleKeywordInput(event) {
        var _a, _b;
        this.setData({
            draftKeyword: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
    },
    handleKeywordConfirm() {
        this.setData({
            keyword: this.data.draftKeyword.trim()
        });
        void this.refreshProducts();
    },
    handleClearSearch() {
        this.setData({
            draftKeyword: '',
            keyword: ''
        });
        void this.refreshProducts();
    },
    async handleLoadMoreProducts() {
        var _a;
        if (!this.data.pageInfo.hasMore || this.data.isLoadingMore) {
            return;
        }
        this.setData({ isLoadingMore: true });
        try {
            const productsResponse = await (0, catalog_admin_1.queryProducts)({
                categoryId: this.data.activeCategoryId,
                status: this.data.statusFilter,
                keyword: this.data.keyword,
                sort: this.data.sort,
                limit: PRODUCT_PAGE_LIMIT,
                cursor: (_a = this.data.pageInfo.nextCursor) !== null && _a !== void 0 ? _a : undefined
            });
            const view = (0, catalog_admin_1.getProductPageViewModel)(productsResponse.items, [], this.data.activeCategoryId, '', productsResponse.summary);
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
        }
        catch (_b) {
            this.setData({ isLoadingMore: false });
            wx.showToast({
                title: '商品加载失败',
                icon: 'none'
            });
        }
    },
    handleCreateTap() {
        wx.navigateTo({
            url: `/pages/product-editor/index?categoryId=${this.data.activeCategoryId}`
        });
    },
    handleEditTap(event) {
        var _a, _b, _c;
        const productId = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '';
        this.setData({ swipedProductId: '' });
        wx.navigateTo({
            url: `/pages/product-editor/index?productId=${productId}`
        });
    },
    handleProductTouchStart(event) {
        var _a, _b, _c;
        this.productTouchStartX = (_c = (_b = (_a = event.touches) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.clientX) !== null && _c !== void 0 ? _c : 0;
    },
    handleProductTouchEnd(event) {
        var _a, _b, _c, _d, _e, _f;
        const productId = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '';
        const endX = (_f = (_e = (_d = event.changedTouches) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.clientX) !== null && _f !== void 0 ? _f : this.productTouchStartX;
        const deltaX = endX - this.productTouchStartX;
        if (!productId || Math.abs(deltaX) < 36) {
            return;
        }
        this.setData({
            swipedProductId: deltaX < 0 ? productId : ''
        });
    },
    async handleMoveProductTap(event) {
        var _a, _b, _c, _d;
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
        const productId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id;
        const direction = (_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.dataset) === null || _d === void 0 ? void 0 : _d.direction;
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
            const products = await (0, catalog_admin_1.reorderProducts)(nextProducts);
            const view = (0, catalog_admin_1.getProductPageViewModel)(products, [], this.data.activeCategoryId, this.data.keyword);
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
        }
        catch (_e) {
            this.setData({ isReordering: false });
            wx.showToast({
                title: '排序保存失败',
                icon: 'none'
            });
            await this.refreshProducts();
        }
    },
    handleDeleteTap(event) {
        var _a, _b, _c, _d, _e, _f;
        const productId = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '';
        const productName = (_f = (_e = (_d = event.currentTarget) === null || _d === void 0 ? void 0 : _d.dataset) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : '当前商品';
        if (!productId) {
            return;
        }
        wx.showModal({
            title: '删除商品',
            content: `确认删除 ${productName}？删除后用户端将不再展示该商品。`,
            confirmText: '删除',
            confirmColor: '#B6463A',
            success: async (result) => {
                if (!result.confirm) {
                    this.setData({ swipedProductId: '' });
                    return;
                }
                try {
                    await (0, catalog_admin_1.deleteProduct)(productId);
                    wx.showToast({
                        title: '已删除',
                        icon: 'success'
                    });
                    this.setData({ swipedProductId: '' });
                    await this.refreshProducts();
                }
                catch (error) {
                    wx.showToast({
                        title: '删除失败',
                        icon: 'none'
                    });
                }
            }
        });
    }
});
