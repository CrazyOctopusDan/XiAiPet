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

async function loadPageModule(modulePath: string) {
  let capturedPage: PageOptions | null = null;
  const wxMock = {
    redirectTo: vi.fn(),
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
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
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/orders/index.ts');
    wx.cloud.callFunction.mockResolvedValue({
      result: {
        ok: true,
        orders: []
      }
    });
    const instance = createPageInstance(page);

    await instance.onShow();

    expect(instance.data.isEmpty).toBe(true);
    expect(instance.data.orderCards).toEqual([]);
    expect(instance.data.emptyStateTitle).toBe('还没有订单');
  });

  it('shows recorded orders and navigates into order detail', async () => {
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

    expect(instance.data.isEmpty).toBe(false);
    expect(instance.data.highlightedOrderId).toBe('order-001');
    expect(instance.data.orderCards[0]).toMatchObject({
      id: 'order-001',
      statusLabel: '已支付'
    });
    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/order-detail/index?orderId=order-001'
    });
  });

  it('renders the order detail page from the stored snapshot', async () => {
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

    expect(instance.data.detail).toMatchObject({
      id: 'order-001',
      statusLabel: '已支付',
      remark: '到店前联系'
    });
  });
});
