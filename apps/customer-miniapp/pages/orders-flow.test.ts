import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderRecord } from '@xiaipet/shared';

type PageOptions = Record<string, unknown> & {
  data: Record<string, unknown>;
};

type TestPageInstance = {
  data: Record<string, any>;
  setData: (updates: Record<string, unknown>, callback?: () => void) => void;
};

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getRequestPath(options: { url: string }) {
  return new URL(options.url).pathname;
}

function respondApi(options: { success?: (response: { statusCode: number; data: Record<string, unknown> }) => void }, data: Record<string, unknown>, statusCode = 200) {
  options.success?.({
    statusCode,
    data
  });
}

async function loadPageModule(modulePath: string) {
  const storage = new Map<string, unknown>();
  let capturedPage: PageOptions | null = null;
  const wxMock = {
    login: vi.fn().mockResolvedValue({ code: 'wx-login-code' }),
    request: vi.fn((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/auth/login') {
        respondApi(options, {
          ok: true,
          token: 'customer-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          openid: 'session-openid'
        });
        return;
      }
      if (path === '/api/v1/customer/orders') {
        respondApi(options, {
          ok: true,
          orders: []
        });
        return;
      }

      respondApi(
        options,
        {
          ok: false,
          code: 'NOT_FOUND',
          message: `Unhandled test API path: ${path}`
        },
        404
      );
    }),
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
    getAccountInfoSync: vi.fn(() => ({
      miniProgram: {
        envVersion: 'develop'
      }
    })),
    getWindowInfo: () => ({ statusBarHeight: 20, windowWidth: 375 }),
    getSystemInfoSync: () => ({ statusBarHeight: 20, windowWidth: 375 }),
    getMenuButtonBoundingClientRect: () => null,
    redirectTo: vi.fn(),
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
    switchTab: vi.fn(),
    showModal: vi.fn().mockResolvedValue({ confirm: true, cancel: false }),
    showToast: vi.fn(),
    stopPullDownRefresh: vi.fn(),
    cloud: {
      callFunction: vi.fn()
    }
  };

  vi.resetModules();
  vi.unstubAllGlobals();

  vi.stubGlobal('wx', wxMock);
  vi.stubGlobal('Page', (options: PageOptions) => {
    capturedPage = options;
  });

  await import(modulePath);

  if (!capturedPage) {
    throw new Error(`Page was not registered for ${modulePath}`);
  }

  return {
    page: capturedPage,
    wx: wxMock
  };
}

function createPageInstance(page: PageOptions) {
  const instance: TestPageInstance & Record<string, any> = {
    data: cloneData(page.data),
    setData(updates: Record<string, unknown>, callback?: () => void) {
      this.data = {
        ...this.data,
        ...updates
      };

      callback?.();
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

function createOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
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

describe('orders pages', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('shows a clear empty state when no order exists', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
    const instance = createPageInstance(page);

    await instance.onShow();

    expect(instance.data.isEmpty).toBe(true);
    expect(instance.data.orderCards).toEqual([]);
    expect(instance.data.emptyStateTitle).toBe('还没有订单');
  });

  it('renders the orders page with the refreshed warm card layout', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
    const { readFile } = await import('node:fs/promises');
    const instance = createPageInstance(page);

    expect(instance.data.emptyStateTitle).toBe('还没有订单');

    const ordersTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.wxml',
      'utf8'
    );
    const ordersStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.wxss',
      'utf8'
    );

    expect(ordersTemplate).toContain('class="orders-badge"');
    expect(ordersTemplate).toContain('class="orders-tabs"');
    expect(ordersTemplate).toContain('data-status-group="{{item.value}}"');
    expect(ordersTemplate).toContain('status-{{item.statusTone}}');
    expect(ordersTemplate).toContain('--orders-header-top: {{ordersHeaderTop}}rpx;');
    expect(ordersTemplate).toContain('class="orders-heading-row"');
    expect(ordersTemplate).toContain('class="empty-mark"');
    expect(ordersTemplate).toContain('class="order-meta-panel"');
    expect(ordersStyles).toContain('linear-gradient(180deg, #FFFDF5 0%, #FFF9DF 54%, #F6E396 100%)');
    expect(ordersStyles).toContain('color: #40535C');
    expect(ordersStyles).toContain('padding: var(--orders-header-top, 96rpx) 24rpx calc(242rpx + env(safe-area-inset-bottom))');
    expect(ordersStyles).toContain('padding-right: var(--orders-header-right, 212rpx)');
    expect(ordersStyles).toContain('.orders-tab.active');
    expect(ordersStyles).toContain('.order-card.status-ready');
    expect(ordersStyles).toContain('.order-card.status-completed');
    expect(ordersStyles).toContain('.catalog-button::after');
  });

  it('derives orders header placement from the WeChat capsule metrics', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
    wx.getWindowInfo = vi.fn(() => ({ statusBarHeight: 20, windowWidth: 375 }));
    (wx as any).getMenuButtonBoundingClientRect = vi.fn(() => ({
      top: 58,
      height: 32,
      bottom: 90,
      left: 282,
      right: 369,
      width: 87
    }));

    const instance = createPageInstance(page);

    await instance.onShow();

    expect(instance.data.ordersHeaderTop).toBe(116);
    expect(instance.data.ordersHeaderHeight).toBe(64);
    expect(instance.data.ordersHeaderRightPadding).toBe(210);
  });

  it('shows recorded orders and navigates into order detail', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/auth/login') {
        respondApi(options, {
          ok: true,
          token: 'customer-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          openid: 'session-openid'
        });
        return;
      }
      if (path === '/api/v1/customer/orders') {
        respondApi(options, {
          ok: true,
          orders: [createOrder()]
        });
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

    expect(instance.data.isEmpty).toBe(false);
    expect(instance.data.highlightedOrderId).toBe('order-001');
    expect(instance.data.orderCards[0]).toMatchObject({
      id: 'order-001',
      statusLabel: '待处理'
    });
    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/order-detail/index?orderId=order-001'
    });
  });

  it('switches status tabs and requests only that order group', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
    wx.request.mockImplementation((options) => {
      const url = new URL(options.url);
      const path = url.pathname;

      if (path === '/api/v1/customer/auth/login') {
        respondApi(options, {
          ok: true,
          token: 'customer-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          openid: 'session-openid'
        });
        return;
      }
      if (path === '/api/v1/customer/orders') {
        const statusGroup = url.searchParams.get('statusGroup');
        respondApi(options, {
          ok: true,
          orders: [
            createOrder({
              id: statusGroup === 'active' ? 'order-ready' : 'order-pending',
              fulfillmentState: {
                mode: 'pickup',
                status: statusGroup === 'active' ? 'ready_for_pickup' : 'pending'
              },
              snapshot: {
                ...createOrder().snapshot,
                fulfillment: {
                  mode: 'pickup',
                  pickupPhone: '18811736099',
                  reservation: createOrder().snapshot.fulfillment.reservation,
                  store: createOrder().snapshot.fulfillment.store
                }
              }
            })
          ],
          pageInfo: {
            hasMore: false,
            nextCursor: null,
            limit: 20
          }
        });
      }
    });
    const instance = createPageInstance(page);

    await instance.onShow();
    await instance.handleStatusTabTap({
      currentTarget: {
        dataset: {
          statusGroup: 'active'
        }
      }
    });

    expect(instance.data.activeStatusGroup).toBe('active');
    expect(instance.data.orderCards[0]).toMatchObject({
      id: 'order-ready',
      statusTone: 'ready'
    });
    expect(
      wx.request.mock.calls.some(([options]) => options.url.includes('/api/v1/customer/orders?statusGroup=active&limit=20'))
    ).toBe(true);
  });

  it('loads the next page for the active status tab when reaching bottom', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
    wx.request.mockImplementation((options) => {
      const url = new URL(options.url);
      const path = url.pathname;

      if (path === '/api/v1/customer/auth/login') {
        respondApi(options, {
          ok: true,
          token: 'customer-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          openid: 'session-openid'
        });
        return;
      }
      if (path === '/api/v1/customer/orders') {
        const cursor = url.searchParams.get('cursor');
        respondApi(options, {
          ok: true,
          orders: [
            createOrder({
              id: cursor ? 'order-page-2' : 'order-page-1',
              fulfillmentState: {
                mode: 'pickup',
                status: 'ready_for_pickup'
              },
              snapshot: {
                ...createOrder().snapshot,
                fulfillment: {
                  mode: 'pickup',
                  pickupPhone: '18811736099',
                  reservation: createOrder().snapshot.fulfillment.reservation,
                  store: createOrder().snapshot.fulfillment.store
                }
              }
            })
          ],
          pageInfo: cursor
            ? { hasMore: false, nextCursor: null, limit: 20 }
            : { hasMore: true, nextCursor: '20', limit: 20 }
        });
      }
    });
    const instance = createPageInstance(page);

    await instance.handleStatusTabTap({
      currentTarget: {
        dataset: {
          statusGroup: 'active'
        }
      }
    });
    await instance.onReachBottom();

    expect(instance.data.orderCards.map((item: { id: string }) => item.id)).toEqual(['order-page-2', 'order-page-1']);
    expect(
      wx.request.mock.calls.some(([options]) => options.url.includes('/api/v1/customer/orders?statusGroup=active&limit=20&cursor=20'))
    ).toBe(true);
  });

  it('refreshes the orders page from the latest API data on pull down', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/auth/login') {
        respondApi(options, {
          ok: true,
          token: 'customer-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          openid: 'session-openid'
        });
        return;
      }
      if (path === '/api/v1/customer/orders') {
        respondApi(options, {
          ok: true,
          orders: [
            {
              ...createOrder({
                snapshot: {
                  ...createOrder().snapshot,
                  fulfillment: {
                    mode: 'pickup',
                    pickupPhone: '18811736099',
                    reservation: createOrder().snapshot.fulfillment.reservation,
                    store: createOrder().snapshot.fulfillment.store
                  }
                },
                fulfillmentState: undefined
              }),
              fulfillmentStatus: 'ready_for_pickup'
            }
          ]
        });
      }
    });
    const instance = createPageInstance(page);

    await instance.onPullDownRefresh();

    expect(instance.data.orderCards[0]).toMatchObject({
      statusLabel: '待自取'
    });
    expect(wx.stopPullDownRefresh).toHaveBeenCalled();
  });

  it('renders the order detail page from the stored snapshot', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/order-detail/index.ts');
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/auth/login') {
        respondApi(options, {
          ok: true,
          token: 'customer-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          openid: 'session-openid'
        });
        return;
      }
      if (path === '/api/v1/customer/orders/order-001') {
        respondApi(options, {
          ok: true,
          order: createOrder()
        });
      }
    });
    const instance = createPageInstance(page);

    instance.onLoad({
      orderId: 'order-001'
    });
    await instance.onShow();

    expect(instance.data.detail).toMatchObject({
      id: 'order-001',
      statusLabel: '待处理',
      hasPets: true,
      pets: [
        {
          name: '奶油'
        }
      ],
      remark: '到店前联系',
      itemsSubtotalLabel: '￥36.00',
      deliveryFeeLabel: '￥10.00',
      payableTotalLabel: '￥46.00'
    });

    const detailTemplate = await (await import('node:fs/promises')).readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/order-detail/index.wxml',
      'utf8'
    );

    expect(detailTemplate).toContain('<page-nav');
    expect(detailTemplate).toContain('bindback="handleBackTap"');
    expect(detailTemplate).toContain('navigate-on-back="{{false}}"');
    expect(detailTemplate).toContain('宠物信息');
    expect(detailTemplate).toContain('wx:for="{{detail.pets}}"');
    expect(detailTemplate).toContain('bindtap="handleCompleteOrderTap"');
  });

  it('lets the customer confirm completion from the order detail page', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/order-detail/index.ts');
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/auth/login') {
        respondApi(options, {
          ok: true,
          token: 'customer-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          openid: 'session-openid'
        });
        return;
      }
      if (path === '/api/v1/customer/orders/order-001/complete') {
        respondApi(options, {
          ok: true,
          order: createOrder({
            fulfillmentState: {
              mode: 'pickup',
              status: 'completed'
            },
            snapshot: {
              ...createOrder().snapshot,
              fulfillment: {
                mode: 'pickup',
                pickupPhone: '18811736099',
                reservation: createOrder().snapshot.fulfillment.reservation,
                store: createOrder().snapshot.fulfillment.store
              }
            }
          })
        });
        return;
      }
      if (path === '/api/v1/customer/orders/order-001') {
        respondApi(options, {
          ok: true,
          order: createOrder({
            fulfillmentState: {
              mode: 'pickup',
              status: 'ready_for_pickup'
            },
            snapshot: {
              ...createOrder().snapshot,
              fulfillment: {
                mode: 'pickup',
                pickupPhone: '18811736099',
                reservation: createOrder().snapshot.fulfillment.reservation,
                store: createOrder().snapshot.fulfillment.store
              }
            }
          })
        });
      }
    });
    const instance = createPageInstance(page);

    instance.onLoad({
      orderId: 'order-001'
    });
    await instance.onShow();
    await instance.handleCompleteOrderTap();

    expect(wx.showModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '确认已取？',
      confirmText: '已取'
    }));
    expect(
      wx.request.mock.calls.some(([options]) => getRequestPath(options) === '/api/v1/customer/orders/order-001/complete')
    ).toBe(true);
    expect(instance.data.detail).toMatchObject({
      statusLabel: '已完成',
      canComplete: false
    });
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '订单已完成',
      icon: 'success'
    });
  });

  it('refreshes the order detail page from the latest API data on pull down', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/order-detail/index.ts');
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/auth/login') {
        respondApi(options, {
          ok: true,
          token: 'customer-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          openid: 'session-openid'
        });
        return;
      }
      if (path === '/api/v1/customer/orders/order-001') {
        respondApi(options, {
          ok: true,
          order: {
            ...createOrder({
              snapshot: {
                ...createOrder().snapshot,
                fulfillment: {
                  mode: 'pickup',
                  pickupPhone: '18811736099',
                  reservation: createOrder().snapshot.fulfillment.reservation,
                  store: createOrder().snapshot.fulfillment.store
                }
              },
              fulfillmentState: undefined
            }),
            fulfillmentStatus: 'ready_for_pickup'
          }
        });
      }
    });
    const instance = createPageInstance(page);

    instance.onLoad({
      orderId: 'order-001'
    });
    await instance.onPullDownRefresh();

    expect(instance.data.detail).toMatchObject({
      statusLabel: '待自取'
    });
    expect(wx.stopPullDownRefresh).toHaveBeenCalled();
  });
});
