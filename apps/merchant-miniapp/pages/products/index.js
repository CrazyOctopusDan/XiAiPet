"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_admin_1 = require("../../src/services/catalog-admin");
Page({
    data: {
        loading: true,
        isEmpty: true,
        activeCategoryId: '',
        draftKeyword: '',
        keyword: '',
        swipedProductId: '',
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
        const categories = await (0, catalog_admin_1.queryCategories)();
        const products = await (0, catalog_admin_1.queryProducts)(this.data.activeCategoryId);
        const view = (0, catalog_admin_1.getProductPageViewModel)(products, categories, this.data.activeCategoryId, this.data.keyword);
        this.setData({
            loading: false,
            isEmpty: view.isEmpty,
            summary: view.summary,
            categoryFilters: view.categoryFilters,
            cards: view.cards
        });
    },
    handleCategoryTap(event) {
        var _a, _b, _c;
        this.setData({
            activeCategoryId: (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : ''
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
