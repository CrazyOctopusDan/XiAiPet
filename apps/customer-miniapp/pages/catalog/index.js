"use strict";
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_1 = require("../../src/services/catalog");
const cart_1 = require("../../src/services/cart");
function withCartQuantity(product) {
    return {
        ...product,
        cartQuantity: product.specs.length ? (0, cart_1.getCartProductTotalQuantity)(product.id) : (0, cart_1.getCartProductQuantity)(product.id)
    };
}
function toPageSections(mode, expandedCategoryIds) {
    return (0, catalog_1.buildCatalogSections)(mode).map((section) => ({
        ...section,
        id: section.category.id,
        isSoldOutExpanded: expandedCategoryIds.includes(section.category.id),
        availableProducts: section.availableProducts.map(withCartQuantity),
        soldOutProducts: section.soldOutProducts.map(withCartQuantity)
    }));
}
Page({
    data: {
        deliveryModes: (0, catalog_1.getDeliveryModes)(),
        activeDeliveryMode: 'delivery',
        categories: (0, catalog_1.getCatalogCategories)(),
        sections: toPageSections('delivery', []),
        activeCategoryId: (_b = (_a = (0, catalog_1.buildCatalogSections)('delivery')[0]) === null || _a === void 0 ? void 0 : _a.category.id) !== null && _b !== void 0 ? _b : '',
        activeSectionSubtitle: (_d = (_c = (0, catalog_1.buildCatalogSections)('delivery')[0]) === null || _c === void 0 ? void 0 : _c.category.sectionTitle) !== null && _d !== void 0 ? _d : '',
        cartCount: (0, cart_1.getCartCount)(),
        showQuickBuy: false,
        selectedProduct: null,
        selectedSpecId: '',
        selectedSpecPrice: 0,
        quantity: 1,
        expandedSoldOutCategoryIds: [],
        scrollIntoViewTarget: ''
    },
    async onLoad() {
        try {
            await (0, catalog_1.hydrateCatalog)();
        }
        catch (_a) {
            // Keep the catalog empty when the customer API is unreachable.
        }
        this.refreshSections(this.data.activeDeliveryMode);
    },
    onReady() {
        this.updateSectionMetrics();
    },
    onShow() {
        this.syncCartState();
    },
    refreshSections(mode, expandedCategoryIds = []) {
        var _a, _b, _c, _d;
        const sections = toPageSections(mode, expandedCategoryIds);
        this.setData({
            categories: (0, catalog_1.getCatalogCategories)(),
            sections,
            activeDeliveryMode: mode,
            activeCategoryId: (_b = (_a = sections[0]) === null || _a === void 0 ? void 0 : _a.category.id) !== null && _b !== void 0 ? _b : '',
            activeSectionSubtitle: (_d = (_c = sections[0]) === null || _c === void 0 ? void 0 : _c.category.sectionTitle) !== null && _d !== void 0 ? _d : '',
            scrollIntoViewTarget: ''
        }, () => {
            this._currentScrollTop = 0;
            this.updateSectionMetrics();
        });
    },
    syncCartState() {
        var _a, _b, _c, _d, _e, _f;
        const sections = toPageSections(this.data.activeDeliveryMode, this.data.expandedSoldOutCategoryIds);
        this.setData({
            cartCount: (0, cart_1.getCartCount)(),
            categories: (0, catalog_1.getCatalogCategories)(),
            sections,
            activeCategoryId: sections.some((section) => section.category.id === this.data.activeCategoryId)
                ? this.data.activeCategoryId
                : (_b = (_a = sections[0]) === null || _a === void 0 ? void 0 : _a.category.id) !== null && _b !== void 0 ? _b : '',
            activeSectionSubtitle: (_f = (_d = (_c = sections.find((section) => section.category.id === this.data.activeCategoryId)) === null || _c === void 0 ? void 0 : _c.category.sectionTitle) !== null && _d !== void 0 ? _d : (_e = sections[0]) === null || _e === void 0 ? void 0 : _e.category.sectionTitle) !== null && _f !== void 0 ? _f : ''
        }, () => {
            this.updateSectionMetrics();
        });
    },
    updateSectionMetrics() {
        const query = wx.createSelectorQuery();
        query.select('.product-column').boundingClientRect();
        query.selectAll('.product-section').boundingClientRect();
        query.exec((result) => {
            var _a, _b;
            const containerRect = result === null || result === void 0 ? void 0 : result[0];
            const sectionRects = (_a = result === null || result === void 0 ? void 0 : result[1]) !== null && _a !== void 0 ? _a : [];
            if (!containerRect || !sectionRects.length) {
                this._sectionMetrics = [];
                return;
            }
            const baseScrollTop = (_b = this._currentScrollTop) !== null && _b !== void 0 ? _b : 0;
            this._sectionMetrics = sectionRects.map((rect, index) => {
                var _a, _b, _c, _d;
                return ({
                    categoryId: (_b = (_a = this.data.sections[index]) === null || _a === void 0 ? void 0 : _a.category.id) !== null && _b !== void 0 ? _b : '',
                    top: Math.max(0, ((_c = rect.top) !== null && _c !== void 0 ? _c : 0) - ((_d = containerRect.top) !== null && _d !== void 0 ? _d : 0) + baseScrollTop)
                });
            });
        });
    },
    syncActiveCategory(scrollTop) {
        var _a, _b, _c, _d;
        this._currentScrollTop = scrollTop;
        if (!((_a = this._sectionMetrics) === null || _a === void 0 ? void 0 : _a.length)) {
            return;
        }
        let nextCategoryId = (_c = (_b = this._sectionMetrics[0]) === null || _b === void 0 ? void 0 : _b.categoryId) !== null && _c !== void 0 ? _c : this.data.activeCategoryId;
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
            activeSectionSubtitle: (_d = activeSection === null || activeSection === void 0 ? void 0 : activeSection.category.sectionTitle) !== null && _d !== void 0 ? _d : ''
        });
    },
    handleDeliveryModeTap(event) {
        var _a, _b;
        const nextMode = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.mode;
        if (!nextMode || nextMode === this.data.activeDeliveryMode) {
            return;
        }
        this.refreshSections(nextMode);
    },
    handleCategoryTap(event) {
        var _a, _b, _c, _d;
        const categoryId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.categoryId;
        if (!categoryId) {
            return;
        }
        this.setData({
            activeCategoryId: categoryId,
            activeSectionSubtitle: (_d = (_c = this.data.sections.find((section) => section.category.id === categoryId)) === null || _c === void 0 ? void 0 : _c.category.sectionTitle) !== null && _d !== void 0 ? _d : '',
            scrollIntoViewTarget: `section-${categoryId}`
        });
    },
    handleProductScroll(event) {
        var _a, _b;
        this.syncActiveCategory((_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.scrollTop) !== null && _b !== void 0 ? _b : 0);
    },
    handleSearchTap() {
        wx.navigateTo({
            url: '/pages/search/index'
        });
    },
    handleProductTap(event) {
        var _a, _b;
        const productId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.productId;
        if (!productId) {
            return;
        }
        wx.navigateTo({
            url: `/pages/product-detail/index?productId=${productId}`
        });
    },
    handleDirectAdd(event) {
        var _a, _b;
        const productId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.productId;
        const product = productId ? (0, catalog_1.getProductById)(productId) : null;
        if (!product || product.soldOut) {
            wx.showToast({ title: '库存不足', icon: 'none' });
            return;
        }
        const result = (0, cart_1.addCartItem)(product, '', 1);
        this.syncCartState();
        wx.showToast({ title: result.capped ? '库存不足' : '已加入购物车', icon: 'none' });
    },
    handleDirectMinus(event) {
        var _a, _b;
        const productId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.productId;
        if (!productId) {
            return;
        }
        const nextQuantity = Math.max(0, (0, cart_1.getCartProductQuantity)(productId) - 1);
        (0, cart_1.updateCartProductQuantity)(productId, '', nextQuantity);
        this.syncCartState();
    },
    handleActionTap() { },
    handleMaskTouchMove() { },
    handleQuickBuyOpen(event) {
        var _a, _b, _c, _d, _e, _f;
        const productId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.productId;
        const product = productId ? (0, catalog_1.getProductById)(productId) : null;
        if (!product) {
            return;
        }
        this.setData({
            showQuickBuy: true,
            selectedProduct: product,
            selectedSpecId: (_d = (_c = product.specs[0]) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : '',
            selectedSpecPrice: (0, catalog_1.getProductDisplayPrice)(product, (_f = (_e = product.specs[0]) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : ''),
            quantity: 1
        });
    },
    handleQuickBuyClose() {
        this.setData({
            showQuickBuy: false,
            selectedProduct: null,
            selectedSpecId: '',
            selectedSpecPrice: 0,
            quantity: 1
        });
    },
    handleSpecTap(event) {
        var _a, _b;
        const specId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.specId;
        if (!specId || !this.data.selectedProduct) {
            return;
        }
        this.setData({
            selectedSpecId: specId,
            selectedSpecPrice: (0, catalog_1.getProductDisplayPrice)(this.data.selectedProduct, specId)
        });
    },
    handleQuantityMinus() {
        this.setData({ quantity: Math.max(1, this.data.quantity - 1) });
    },
    handleQuantityPlus() {
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
    handleConfirmQuickBuy() {
        if (!this.data.selectedProduct) {
            return;
        }
        const result = (0, cart_1.addCartItem)(this.data.selectedProduct, this.data.selectedSpecId, this.data.quantity);
        this.setData({
            cartCount: (0, cart_1.getCartCount)(),
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
    handleToggleSoldOut(event) {
        var _a, _b;
        const categoryId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.categoryId;
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
