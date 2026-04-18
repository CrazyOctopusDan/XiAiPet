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
        categoryFilters: [],
        cards: []
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
    handleCreateTap() {
        wx.navigateTo({
            url: `/pages/product-editor/index?categoryId=${this.data.activeCategoryId}`
        });
    },
    handleEditTap(event) {
        var _a, _b, _c;
        const productId = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '';
        wx.navigateTo({
            url: `/pages/product-editor/index?productId=${productId}`
        });
    }
});
