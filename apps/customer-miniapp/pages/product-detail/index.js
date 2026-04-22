"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cart_1 = require("../../src/services/cart");
const catalog_1 = require("../../src/services/catalog");
function requiresSpecSelection(product) {
    return Boolean(product === null || product === void 0 ? void 0 : product.specs.length);
}
function resolveSelectedSpecLabel(product, specId) {
    if (!product) {
        return '';
    }
    if (!requiresSpecSelection(product)) {
        return product.summary || '默认规格';
    }
    if (!specId) {
        return '请选择规格信息';
    }
    return (0, catalog_1.getProductSelectedSpecLabel)(product, specId);
}
function resolveAddToCartDisabled(product, specId) {
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
        cartCount: (0, cart_1.getCartCount)(),
        swiperIndex: 1,
        isAddToCartDisabled: true
    },
    onLoad(query) {
        const product = query.productId ? (0, catalog_1.getProductById)(query.productId) : null;
        const selectedSpecId = '';
        this.setData({
            product,
            selectedSpecId,
            selectedSpecLabel: resolveSelectedSpecLabel(product, selectedSpecId),
            selectedPrice: product ? (0, catalog_1.getProductDisplayPrice)(product, selectedSpecId) : 0,
            quantity: 1,
            cartCount: (0, cart_1.getCartCount)(),
            swiperIndex: 1,
            isAddToCartDisabled: resolveAddToCartDisabled(product, selectedSpecId)
        });
    },
    onShow() {
        this.syncCartCount();
    },
    syncCartCount() {
        this.setData({
            cartCount: (0, cart_1.getCartCount)()
        });
    },
    handleSpecTap(event) {
        var _a, _b;
        const specId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.specId;
        if (!specId) {
            return;
        }
        if (!this.data.product) {
            return;
        }
        this.setData({
            selectedSpecId: specId,
            selectedSpecLabel: resolveSelectedSpecLabel(this.data.product, specId),
            selectedPrice: (0, catalog_1.getProductDisplayPrice)(this.data.product, specId),
            isAddToCartDisabled: resolveAddToCartDisabled(this.data.product, specId)
        });
    },
    handleSwiperChange(event) {
        var _a, _b;
        this.setData({ swiperIndex: ((_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.current) !== null && _b !== void 0 ? _b : 0) + 1 });
    },
    handleMinus() {
        if (this.data.quantity <= 1) {
            return;
        }
        this.setData({ quantity: this.data.quantity - 1 });
    },
    handlePlus() {
        if (!this.data.product) {
            return;
        }
        if (this.data.quantity >= this.data.product.stock) {
            wx.showToast({ title: '库存不足', icon: 'none' });
            return;
        }
        this.setData({ quantity: this.data.quantity + 1 });
    },
    handleAddToCart() {
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
        const result = (0, cart_1.addCartItem)(this.data.product, this.data.selectedSpecId, this.data.quantity);
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
        var _a, _b;
        const product = this.data.product;
        return {
            title: (_a = product === null || product === void 0 ? void 0 : product.name) !== null && _a !== void 0 ? _a : 'Paws Only 商品详情',
            path: `/pages/product-detail/index?productId=${(_b = product === null || product === void 0 ? void 0 : product.id) !== null && _b !== void 0 ? _b : ''}`
        };
    }
});
