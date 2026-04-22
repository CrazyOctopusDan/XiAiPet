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
        redirectTo: vitest_1.vi.fn(),
        cloud: {
            callFunction: vitest_1.vi.fn().mockResolvedValue({
                result: {
                    ok: true,
                    banner: null,
                    store: null,
                    customNotice: null,
                    deliveryRules: null
                }
            })
        }
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
(0, vitest_1.describe)('cart checkout flow', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)('clears cart page items and summary when the user empties the cart', async () => {
        var _a, _b;
        const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { addCartItem, clearCart } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        clearCart();
        const directProduct = getProductById('sea-sponge');
        const specProduct = getProductById('ocean-party');
        if (!directProduct || !specProduct) {
            throw new Error('missing product fixtures');
        }
        addCartItem(directProduct, '', 1);
        addCartItem(specProduct, (_b = (_a = specProduct.specs[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : '', 1);
        const instance = createPageInstance(page);
        instance.onShow();
        (0, vitest_1.expect)(instance.data.items).toHaveLength(2);
        (0, vitest_1.expect)(instance.data.selectedCount).toBe(2);
        instance.handleClearCart();
        (0, vitest_1.expect)(instance.data.items).toHaveLength(0);
        (0, vitest_1.expect)(instance.data.selectedCount).toBe(0);
        (0, vitest_1.expect)(instance.data.selectedTotalPrice).toBe(0);
        (0, vitest_1.expect)(instance.data.cartCount).toBe(0);
    });
    (0, vitest_1.it)('navigates from cart checkout into the checkout handoff page', async () => {
        var _a, _b;
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { addCartItem, clearCart } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        clearCart();
        const product = getProductById('ocean-party');
        if (!product) {
            throw new Error('missing product fixture');
        }
        addCartItem(product, (_b = (_a = product.specs[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : '', 1);
        const instance = createPageInstance(page);
        instance.onShow();
        instance.handleCheckout();
        (0, vitest_1.expect)(wx.navigateTo).toHaveBeenCalledWith({
            url: '/pages/checkout/index?source=cart'
        });
    });
    (0, vitest_1.it)('shows only selected cart rows on the checkout handoff page', async () => {
        var _a, _b, _c, _d;
        const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { addCartItem, clearCart, getCartItems, updateCartItemSelection } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        clearCart();
        const directProduct = getProductById('sea-sponge');
        const specProduct = getProductById('ocean-party');
        if (!directProduct || !specProduct) {
            throw new Error('missing product fixtures');
        }
        addCartItem(directProduct, '', 1);
        addCartItem(specProduct, (_b = (_a = specProduct.specs[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : '', 2);
        const directRow = getCartItems().find((item) => item.productId === directProduct.id);
        if (!directRow) {
            throw new Error('missing direct row');
        }
        updateCartItemSelection(directRow.id, false);
        const instance = createPageInstance(page);
        instance.onShow();
        (0, vitest_1.expect)(instance.data.items).toHaveLength(1);
        (0, vitest_1.expect)((_c = instance.data.items[0]) === null || _c === void 0 ? void 0 : _c.productId).toBe(specProduct.id);
        (0, vitest_1.expect)(instance.data.selectedCount).toBe(2);
        (0, vitest_1.expect)(instance.data.selectedTotalPrice).toBe(((_d = specProduct.specs[0]) === null || _d === void 0 ? void 0 : _d.price) * 2);
    });
    (0, vitest_1.it)('hydrates checkout runtime config from readRuntimeConfig and hides disabled notices', async () => {
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
        wx.cloud.callFunction.mockResolvedValueOnce({
            result: {
                ok: true,
                banner: null,
                store: {
                    address: '上海市徐汇区永嘉路 88 号',
                    latitude: 31.205,
                    longitude: 121.44,
                    contactPhone: '13600000000'
                },
                customNotice: {
                    enabled: false,
                    content: '这条提示不应该展示'
                },
                deliveryRules: {
                    tiers: [
                        {
                            distanceKm: 5,
                            minimumOrderAmount: 98,
                            deliveryFee: 0,
                            explainer: '5.0 公里内 98 元起送，配送费 0 元'
                        }
                    ]
                }
            }
        });
        const instance = createPageInstance(page);
        await instance.refreshRuntimeConfig();
        (0, vitest_1.expect)(wx.cloud.callFunction).toHaveBeenCalledWith({
            name: 'readRuntimeConfig',
            data: {}
        });
        (0, vitest_1.expect)(instance.data.storeAddress).toBe('上海市徐汇区永嘉路 88 号');
        (0, vitest_1.expect)(instance.data.customNotice).toBe('');
        (0, vitest_1.expect)(instance.data.deliveryRuleRows).toEqual(['5.0 公里内 98 元起送，配送费 0 元']);
    });
    (0, vitest_1.it)('shows the selected address summary on the checkout handoff page', async () => {
        const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
        const { clearCart } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        const { getAddresses, resetAddresses, selectAddress, setCheckoutAddressType } = await Promise.resolve().then(() => __importStar(require('../src/services/address')));
        clearCart();
        resetAddresses();
        const cityAddress = getAddresses('city')[0];
        if (!cityAddress) {
            throw new Error('missing city address fixture');
        }
        setCheckoutAddressType('city');
        selectAddress(cityAddress.id);
        const instance = createPageInstance(page);
        instance.onShow();
        (0, vitest_1.expect)(instance.data.selectedAddress).toMatchObject({
            id: cityAddress.id,
            recipientName: cityAddress.recipientName,
            type: 'city'
        });
    });
    (0, vitest_1.it)('exposes delivery, pickup, and express fulfillment modes on the checkout page', async () => {
        const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
        const instance = createPageInstance(page);
        instance.onShow();
        (0, vitest_1.expect)(instance.data.fulfillmentModes.map((item) => item.value)).toEqual([
            'delivery',
            'pickup',
            'express'
        ]);
        (0, vitest_1.expect)(instance.data.activeFulfillmentMode).toBe('delivery');
    });
    (0, vitest_1.it)('navigates from checkout into the dedicated remark editor', async () => {
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
        const instance = createPageInstance(page);
        instance.handleRemarkTap();
        (0, vitest_1.expect)(wx.navigateTo).toHaveBeenCalledWith({
            url: '/pages/checkout-remark/index'
        });
    });
    (0, vitest_1.it)('shows wechat and balance payment methods on the checkout page', async () => {
        const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
        const instance = createPageInstance(page);
        instance.onShow();
        (0, vitest_1.expect)(instance.data.paymentMethods.map((item) => item.value)).toEqual([
            'wechat',
            'balance'
        ]);
        (0, vitest_1.expect)(instance.data.activePaymentMethod).toBe('wechat');
    });
    (0, vitest_1.it)('redirects to the orders page after a successful checkout submit', async () => {
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { addCartItem, clearCart } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        const { getAddresses, resetAddresses, selectAddress } = await Promise.resolve().then(() => __importStar(require('../src/services/address')));
        const { resetCheckoutDraft, setCustomNoticeAcknowledged, setReservationSelection } = await Promise.resolve().then(() => __importStar(require('../src/services/checkout')));
        clearCart();
        resetAddresses();
        resetCheckoutDraft();
        const product = getProductById('sea-sponge');
        const address = getAddresses('city')[0];
        if (!product || !address) {
            throw new Error('missing checkout submit fixtures');
        }
        addCartItem(product, '', 1);
        selectAddress(address.id);
        setCustomNoticeAcknowledged(true);
        setReservationSelection({
            dateValue: '2026-04-17',
            dateLabel: '今天 04-17',
            timeValue: '11:00',
            timeLabel: '11:00'
        });
        wx.cloud.callFunction
            .mockResolvedValueOnce({
            result: {
                ok: true,
                banner: null,
                store: null,
                customNotice: null,
                deliveryRules: null
            }
        })
            .mockResolvedValueOnce({
            result: {
                ok: true,
                order: {
                    id: 'order-001',
                    status: 'pending_payment',
                    paymentMethod: 'balance',
                    payment: {
                        method: 'balance',
                        status: 'pending'
                    },
                    pricing: {
                        itemsSubtotal: 36,
                        deliveryFee: 10,
                        payableTotal: 46
                    },
                    snapshot: {
                        fulfillment: {
                            mode: 'delivery',
                            address: {
                                id: address.id,
                                recipientName: address.recipientName,
                                phoneNumber: address.phoneNumber,
                                regionLabel: address.regionLabel,
                                detailAddress: address.detailAddress,
                                tag: address.tag
                            },
                            reservation: {
                                dateValue: '2026-04-17',
                                dateLabel: '今天 04-17',
                                timeValue: '11:00',
                                timeLabel: '11:00'
                            },
                            store: {
                                name: '虾衣宠物烘焙工作室',
                                address: '上海市静安区南京西路 1266 号 8 楼'
                            }
                        },
                        items: [
                            {
                                productId: product.id,
                                name: product.name,
                                quantity: 1,
                                unitPrice: 36,
                                specId: '',
                                specLabel: '',
                                lineTotal: 36
                            }
                        ],
                        pets: [],
                        remark: ''
                    },
                    createdAt: '2026-04-17T10:00:00.000Z',
                    updatedAt: '2026-04-17T10:00:00.000Z'
                }
            }
        })
            .mockResolvedValueOnce({
            result: {
                ok: true,
                paymentStatus: 'paid',
                order: {
                    id: 'order-001',
                    status: 'paid',
                    paymentMethod: 'balance',
                    payment: {
                        method: 'balance',
                        status: 'paid'
                    },
                    pricing: {
                        itemsSubtotal: 36,
                        deliveryFee: 10,
                        payableTotal: 46
                    },
                    snapshot: {
                        fulfillment: {
                            mode: 'delivery',
                            address: {
                                id: address.id,
                                recipientName: address.recipientName,
                                phoneNumber: address.phoneNumber,
                                regionLabel: address.regionLabel,
                                detailAddress: address.detailAddress,
                                tag: address.tag
                            },
                            reservation: {
                                dateValue: '2026-04-17',
                                dateLabel: '今天 04-17',
                                timeValue: '11:00',
                                timeLabel: '11:00'
                            },
                            store: {
                                name: '虾衣宠物烘焙工作室',
                                address: '上海市静安区南京西路 1266 号 8 楼'
                            }
                        },
                        items: [
                            {
                                productId: product.id,
                                name: product.name,
                                quantity: 1,
                                unitPrice: 36,
                                specId: '',
                                specLabel: '',
                                lineTotal: 36
                            }
                        ],
                        pets: [],
                        remark: ''
                    },
                    createdAt: '2026-04-17T10:00:00.000Z',
                    updatedAt: '2026-04-17T10:01:00.000Z'
                }
            }
        });
        const instance = createPageInstance(page);
        instance.onShow();
        instance.handlePaymentMethodTap({
            currentTarget: {
                dataset: {
                    method: 'balance'
                }
            }
        });
        await instance.handleSubmit();
        (0, vitest_1.expect)(wx.redirectTo).toHaveBeenCalledWith({
            url: '/pages/orders/index?highlightOrderId=order-001'
        });
    });
    (0, vitest_1.it)('ignores repeated submit taps while the checkout request is still in flight', async () => {
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
        const { getProductById } = await Promise.resolve().then(() => __importStar(require('../src/services/catalog')));
        const { addCartItem, clearCart } = await Promise.resolve().then(() => __importStar(require('../src/services/cart')));
        const { getAddresses, resetAddresses, selectAddress } = await Promise.resolve().then(() => __importStar(require('../src/services/address')));
        const { resetCheckoutDraft, setCustomNoticeAcknowledged, setReservationSelection } = await Promise.resolve().then(() => __importStar(require('../src/services/checkout')));
        clearCart();
        resetAddresses();
        resetCheckoutDraft();
        const product = getProductById('sea-sponge');
        const address = getAddresses('city')[0];
        if (!product || !address) {
            throw new Error('missing checkout submit fixtures');
        }
        addCartItem(product, '', 1);
        selectAddress(address.id);
        setCustomNoticeAcknowledged(true);
        setReservationSelection({
            dateValue: '2026-04-17',
            dateLabel: '今天 04-17',
            timeValue: '11:00',
            timeLabel: '11:00'
        });
        let resolvePayment = null;
        wx.cloud.callFunction
            .mockResolvedValueOnce({
            result: {
                ok: true,
                banner: null,
                store: null,
                customNotice: null,
                deliveryRules: null
            }
        })
            .mockResolvedValueOnce({
            result: {
                ok: true,
                order: {
                    id: 'order-001',
                    status: 'pending_payment',
                    paymentMethod: 'balance',
                    payment: {
                        method: 'balance',
                        status: 'pending'
                    },
                    pricing: {
                        itemsSubtotal: 36,
                        deliveryFee: 10,
                        payableTotal: 46
                    },
                    snapshot: {
                        fulfillment: {
                            mode: 'delivery',
                            address: {
                                id: address.id,
                                recipientName: address.recipientName,
                                phoneNumber: address.phoneNumber,
                                regionLabel: address.regionLabel,
                                detailAddress: address.detailAddress,
                                tag: address.tag
                            },
                            reservation: {
                                dateValue: '2026-04-17',
                                dateLabel: '今天 04-17',
                                timeValue: '11:00',
                                timeLabel: '11:00'
                            },
                            store: {
                                name: '虾衣宠物烘焙工作室',
                                address: '上海市静安区南京西路 1266 号 8 楼'
                            }
                        },
                        items: [
                            {
                                productId: product.id,
                                name: product.name,
                                quantity: 1,
                                unitPrice: 36,
                                specId: '',
                                specLabel: '',
                                lineTotal: 36
                            }
                        ],
                        pets: [],
                        remark: ''
                    },
                    createdAt: '2026-04-17T10:00:00.000Z',
                    updatedAt: '2026-04-17T10:00:00.000Z'
                }
            }
        })
            .mockImplementationOnce(() => new Promise((resolve) => {
            resolvePayment = resolve;
        }));
        const instance = createPageInstance(page);
        instance.onShow();
        instance.handlePaymentMethodTap({
            currentTarget: {
                dataset: {
                    method: 'balance'
                }
            }
        });
        const firstSubmit = instance.handleSubmit();
        const secondSubmit = instance.handleSubmit();
        await Promise.resolve();
        await Promise.resolve();
        (0, vitest_1.expect)(wx.cloud.callFunction).toHaveBeenCalledTimes(3);
        if (resolvePayment) {
            resolvePayment({
                result: {
                    ok: true,
                    paymentStatus: 'paid',
                    order: {
                        id: 'order-001',
                        status: 'paid',
                        paymentMethod: 'balance',
                        payment: {
                            method: 'balance',
                            status: 'paid'
                        },
                        pricing: {
                            itemsSubtotal: 36,
                            deliveryFee: 10,
                            payableTotal: 46
                        },
                        snapshot: {
                            fulfillment: {
                                mode: 'delivery',
                                address: {
                                    id: address.id,
                                    recipientName: address.recipientName,
                                    phoneNumber: address.phoneNumber,
                                    regionLabel: address.regionLabel,
                                    detailAddress: address.detailAddress,
                                    tag: address.tag
                                },
                                reservation: {
                                    dateValue: '2026-04-17',
                                    dateLabel: '今天 04-17',
                                    timeValue: '11:00',
                                    timeLabel: '11:00'
                                },
                                store: {
                                    name: '虾衣宠物烘焙工作室',
                                    address: '上海市静安区南京西路 1266 号 8 楼'
                                }
                            },
                            items: [
                                {
                                    productId: product.id,
                                    name: product.name,
                                    quantity: 1,
                                    unitPrice: 36,
                                    specId: '',
                                    specLabel: '',
                                    lineTotal: 36
                                }
                            ],
                            pets: [],
                            remark: ''
                        },
                        createdAt: '2026-04-17T10:00:00.000Z',
                        updatedAt: '2026-04-17T10:01:00.000Z'
                    }
                }
            });
        }
        await Promise.all([firstSubmit, secondSubmit]);
        (0, vitest_1.expect)(wx.cloud.callFunction).toHaveBeenCalledTimes(3);
    });
});
