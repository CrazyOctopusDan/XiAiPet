"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}
async function loadPageModule(modulePath) {
    let capturedPage = null;
    const wxMock = {
        getWindowInfo: () => ({ statusBarHeight: 20 }),
        getSystemInfoSync: () => ({ statusBarHeight: 20 }),
        getMenuButtonBoundingClientRect: () => null,
        showToast: vitest_1.vi.fn(),
        navigateTo: vitest_1.vi.fn(),
        navigateBack: vitest_1.vi.fn(),
        showShareMenu: vitest_1.vi.fn()
    };
    vitest_1.vi.resetModules();
    vitest_1.vi.unstubAllGlobals();
    vitest_1.vi.stubGlobal('wx', wxMock);
    vitest_1.vi.stubGlobal('Page', (options) => {
        capturedPage = options;
    });
    await Promise.resolve(`${modulePath}`).then(s => __importStar(require(s)));
    if (!capturedPage) {
        throw new Error(`Page was not registered for ${modulePath}`);
    }
    return {
        page: capturedPage,
        wx: wxMock
    };
}
function createPageInstance(page) {
    const instance = {
        data: cloneData(page.data),
        setData(updates, callback) {
            this.data = {
                ...this.data,
                ...updates
            };
            callback === null || callback === void 0 ? void 0 : callback();
        }
    };
    Object.entries(page).forEach(([key, value]) => {
        if (key === 'data') {
            return;
        }
        instance[key] = typeof value === 'function' ? value.bind(instance) : value;
    });
    return instance;
}
(0, vitest_1.describe)('discovery cart pages', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)('opens quick buy in search when a spec product is added', async () => {
        var _a, _b, _c;
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/search/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { clearCart } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        const product = getProductById('ocean-party');
        clearCart();
        if (!product) {
            throw new Error('missing product fixture');
        }
        const instance = createPageInstance(page);
        instance.data.results = [product];
        instance.handleAdd({
            currentTarget: {
                dataset: {
                    productId: product.id,
                    soldOut: false,
                    hasSpec: true
                }
            }
        });
        (0, vitest_1.expect)(instance.data.showQuickBuy).toBe(true);
        (0, vitest_1.expect)((_a = instance.data.selectedProduct) === null || _a === void 0 ? void 0 : _a.id).toBe(product.id);
        (0, vitest_1.expect)(instance.data.selectedSpecId).toBe((_c = (_b = product.specs[0]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '');
        (0, vitest_1.expect)(wx.showToast).not.toHaveBeenCalledWith(vitest_1.expect.objectContaining({ title: '请进入详情页选规格' }));
    });
    (0, vitest_1.it)('confirms quick buy from search into the selected spec row', async () => {
        var _a, _b, _c;
        const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/search/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { clearCart, getCartProductQuantity } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        const product = getProductById('ocean-party');
        clearCart();
        if (!product) {
            throw new Error('missing product fixture');
        }
        const instance = createPageInstance(page);
        instance.data.results = [product];
        instance.handleAdd({
            currentTarget: {
                dataset: {
                    productId: product.id,
                    soldOut: false,
                    hasSpec: true
                }
            }
        });
        instance.handleSpecTap({
            currentTarget: {
                dataset: {
                    specId: (_a = product.specs[1]) === null || _a === void 0 ? void 0 : _a.id
                }
            }
        });
        instance.handleConfirmQuickBuy();
        (0, vitest_1.expect)(getCartProductQuantity(product.id, (_c = (_b = product.specs[1]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '')).toBe(1);
        (0, vitest_1.expect)(instance.data.cartCount).toBe(1);
        (0, vitest_1.expect)(instance.data.showQuickBuy).toBe(false);
    });
    (0, vitest_1.it)('keeps detail stepper as local pending quantity until add-to-cart is confirmed', async () => {
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { clearCart, getCartCount, getCartProductQuantity } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        const product = getProductById('sea-sponge');
        if (!product) {
            throw new Error('missing direct-add product fixture');
        }
        clearCart();
        const instance = createPageInstance(page);
        instance.onLoad({ productId: product.id });
        instance.onShow();
        (0, vitest_1.expect)(instance.data.quantity).toBe(1);
        (0, vitest_1.expect)(instance.data.cartCount).toBe(0);
        instance.handlePlus();
        (0, vitest_1.expect)(instance.data.quantity).toBe(2);
        (0, vitest_1.expect)(getCartProductQuantity(product.id)).toBe(0);
        (0, vitest_1.expect)(getCartCount()).toBe(0);
        instance.handleAddToCart();
        (0, vitest_1.expect)(getCartProductQuantity(product.id)).toBe(2);
        (0, vitest_1.expect)(getCartCount()).toBe(2);
        (0, vitest_1.expect)(instance.data.cartCount).toBe(2);
        (0, vitest_1.expect)(wx.showToast).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ title: '已加入购物车' }));
    });
    (0, vitest_1.it)('requires spec selection before adding a spec product from detail', async () => {
        var _a, _b, _c;
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { clearCart, getCartCount, getCartProductQuantity } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        const product = getProductById('ocean-party');
        if (!product) {
            throw new Error('missing spec product fixture');
        }
        clearCart();
        const instance = createPageInstance(page);
        instance.onLoad({ productId: product.id });
        (0, vitest_1.expect)(instance.data.isAddToCartDisabled).toBe(true);
        (0, vitest_1.expect)(instance.data.selectedSpecLabel).toBe('请选择规格信息');
        instance.handleAddToCart();
        (0, vitest_1.expect)(wx.showToast).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ title: '请先选择规格信息' }));
        (0, vitest_1.expect)(getCartCount()).toBe(0);
        instance.handleSpecTap({
            currentTarget: {
                dataset: {
                    specId: (_a = product.specs[1]) === null || _a === void 0 ? void 0 : _a.id
                }
            }
        });
        instance.handlePlus();
        instance.handleAddToCart();
        (0, vitest_1.expect)(instance.data.isAddToCartDisabled).toBe(false);
        (0, vitest_1.expect)(getCartProductQuantity(product.id, (_c = (_b = product.specs[1]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '')).toBe(2);
    });
});
