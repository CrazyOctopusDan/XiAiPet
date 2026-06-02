"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cart_1 = require("../../src/services/cart");
const catalog_1 = require("../../src/services/catalog");
let searchTimer = null;
function withCartQuantity(product) {
    return {
        ...product,
        cartQuantity: product.specs.length ? (0, cart_1.getCartProductTotalQuantity)(product.id) : (0, cart_1.getCartProductQuantity)(product.id)
    };
}
function defaultPageInfo() {
    return { hasMore: false, nextCursor: null };
}
function mergeResults(existingResults, incomingResults) {
    const byId = new Map();
    const orderedIds = [];
    existingResults.forEach((result) => {
        byId.set(result.id, result);
        orderedIds.push(result.id);
    });
    incomingResults.forEach((result) => {
        if (!byId.has(result.id)) {
            orderedIds.push(result.id);
        }
        byId.set(result.id, result);
    });
    return orderedIds
        .map((id) => byId.get(id))
        .filter((result) => Boolean(result));
}
Page({
    data: {
        keyword: '',
        results: [],
        hasSearched: false,
        cartCount: (0, cart_1.getCartCount)(),
        showQuickBuy: false,
        selectedProduct: null,
        selectedSpecId: '',
        selectedSpecPrice: 0,
        quantity: 1,
        pageInfo: defaultPageInfo(),
        isLoading: false
    },
    onShow() {
        this.setData({
            cartCount: (0, cart_1.getCartCount)(),
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
    handleKeywordInput(event) {
        var _a, _b;
        const keyword = (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
        this.setData({ keyword });
        if (searchTimer) {
            clearTimeout(searchTimer);
        }
        if (!keyword.trim()) {
            this.setData({
                hasSearched: false,
                results: [],
                pageInfo: defaultPageInfo(),
                isLoading: false
            });
            return;
        }
        searchTimer = setTimeout(() => {
            void this.commitResults(keyword);
        }, 180);
    },
    async commitResults(keyword, cursor) {
        this.setData({ isLoading: true });
        try {
            const response = await (0, catalog_1.searchCatalogProducts)({ keyword, cursor });
            const nextResults = response.items.map(withCartQuantity);
            this.setData({
                hasSearched: true,
                results: cursor ? mergeResults(this.data.results, nextResults) : nextResults,
                pageInfo: response.pageInfo,
                isLoading: false
            });
        }
        catch (_a) {
            this.setData({
                hasSearched: true,
                isLoading: false
            });
            wx.showToast({ title: '搜索失败', icon: 'none' });
        }
    },
    async handleLoadMore() {
        var _a;
        if (!this.data.pageInfo.hasMore || this.data.isLoading) {
            return;
        }
        await this.commitResults(this.data.keyword, (_a = this.data.pageInfo.nextCursor) !== null && _a !== void 0 ? _a : undefined);
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
    async handleAdd(event) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const productId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.productId;
        let product = productId ? (0, catalog_1.getProductById)(productId) : null;
        if ((_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.dataset) === null || _d === void 0 ? void 0 : _d.soldOut) {
            wx.showToast({ title: '库存不足', icon: 'none' });
            return;
        }
        if (!product && productId) {
            try {
                product = await (0, catalog_1.getProductDetail)(productId);
            }
            catch (_l) {
                product = null;
            }
        }
        if (!product) {
            wx.showToast({ title: '商品加载失败', icon: 'none' });
            return;
        }
        if ((_f = (_e = event.currentTarget) === null || _e === void 0 ? void 0 : _e.dataset) === null || _f === void 0 ? void 0 : _f.hasSpec) {
            this.setData({
                showQuickBuy: true,
                selectedProduct: product,
                selectedSpecId: (_h = (_g = product.specs[0]) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : '',
                selectedSpecPrice: (0, catalog_1.getProductDisplayPrice)(product, (_k = (_j = product.specs[0]) === null || _j === void 0 ? void 0 : _j.id) !== null && _k !== void 0 ? _k : ''),
                quantity: 1
            });
            return;
        }
        const result = (0, cart_1.addCartItem)(product, '', 1);
        wx.showToast({ title: result.capped ? '库存不足' : '已加入购物车', icon: 'none' });
        this.setData({
            cartCount: (0, cart_1.getCartCount)(),
            results: this.data.results.map(withCartQuantity)
        });
    },
    handleMinus(event) {
        var _a, _b;
        const productId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.productId;
        if (!productId) {
            return;
        }
        (0, cart_1.updateCartProductQuantity)(productId, '', Math.max(0, (0, cart_1.getCartProductQuantity)(productId) - 1));
        this.setData({
            cartCount: (0, cart_1.getCartCount)(),
            results: this.data.results.map(withCartQuantity)
        });
    },
    handleActionTap() {
        return;
    },
    handleMaskTouchMove() {
        return;
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
