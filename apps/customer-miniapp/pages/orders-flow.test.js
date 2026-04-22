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
        redirectTo: vitest_1.vi.fn(),
        navigateTo: vitest_1.vi.fn(),
        navigateBack: vitest_1.vi.fn(),
        cloud: {
            callFunction: vitest_1.vi.fn()
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
function createOrder(overrides = {}) {
    return {
        id: 'order-001',
        openid: 'mock-openid',
        status: 'paid',
        paymentMethod: 'wechat',
        pricing: {
            itemsSubtotal: 36,
            deliveryFee: 10,
            payableTotal: 46
        },
        snapshot: {
            fulfillment: {
                mode: 'delivery',
                address: {
                    id: 'address-city-home',
                    recipientName: '虾衣妈妈',
                    phoneNumber: '13800001234',
                    regionLabel: '上海市 静安区',
                    detailAddress: '南京西路 1266 号 8 楼',
                    tag: '家'
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
                    productId: 'sea-sponge',
                    name: '海绵宝宝蛋糕',
                    quantity: 1,
                    unitPrice: 36,
                    specId: '',
                    specLabel: '',
                    lineTotal: 36
                }
            ],
            pets: [
                {
                    id: 'pet-1',
                    name: '奶油'
                }
            ],
            remark: '到店前联系'
        },
        createdAt: '2026-04-17T10:00:00.000Z',
        updatedAt: '2026-04-17T10:01:00.000Z',
        ...overrides
    };
}
(0, vitest_1.describe)('orders pages', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)('shows a clear empty state when no order exists', async () => {
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
        wx.cloud.callFunction.mockResolvedValue({
            result: {
                ok: true,
                orders: []
            }
        });
        const instance = createPageInstance(page);
        await instance.onShow();
        (0, vitest_1.expect)(instance.data.isEmpty).toBe(true);
        (0, vitest_1.expect)(instance.data.orderCards).toEqual([]);
        (0, vitest_1.expect)(instance.data.emptyStateTitle).toBe('还没有订单');
    });
    (0, vitest_1.it)('shows recorded orders and navigates into order detail', async () => {
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
        wx.cloud.callFunction.mockResolvedValue({
            result: {
                ok: true,
                orders: [createOrder()]
            }
        });
        const instance = createPageInstance(page);
        instance.onLoad({
            highlightOrderId: 'order-001'
        });
        await instance.onShow();
        instance.handleOrderTap({
            currentTarget: {
                dataset: {
                    orderId: 'order-001'
                }
            }
        });
        (0, vitest_1.expect)(instance.data.isEmpty).toBe(false);
        (0, vitest_1.expect)(instance.data.highlightedOrderId).toBe('order-001');
        (0, vitest_1.expect)(instance.data.orderCards[0]).toMatchObject({
            id: 'order-001',
            statusLabel: '已支付'
        });
        (0, vitest_1.expect)(wx.navigateTo).toHaveBeenCalledWith({
            url: '/pages/order-detail/index?orderId=order-001'
        });
    });
    (0, vitest_1.it)('renders the order detail page from the stored snapshot', async () => {
        const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/order-detail/index.ts');
        wx.cloud.callFunction.mockResolvedValue({
            result: {
                ok: true,
                order: createOrder()
            }
        });
        const instance = createPageInstance(page);
        instance.onLoad({
            orderId: 'order-001'
        });
        await instance.onShow();
        (0, vitest_1.expect)(instance.data.detail).toMatchObject({
            id: 'order-001',
            statusLabel: '已支付',
            remark: '到店前联系'
        });
    });
});
