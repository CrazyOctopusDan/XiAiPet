import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    login: vi.fn().mockResolvedValue({ code: 'wx-login-code' }),
    request: vi.fn(),
    getStorageSync: vi.fn(),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    getAccountInfoSync: vi.fn(() => ({
      miniProgram: {
        envVersion: 'develop'
      }
    })),
    getWindowInfo: () => ({ statusBarHeight: 20 }),
    getSystemInfoSync: () => ({ statusBarHeight: 20 }),
    getMenuButtonBoundingClientRect: () => null,
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
    redirectTo: vi.fn(),
    showToast: vi.fn(),
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

describe('customer recharge and gift page flow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('navigates from balance page to recharge page', async () => {
    const { page, wx } = await loadPageModule(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/balance/index.ts'
    );
    const instance = createPageInstance(page);

    instance.handleRechargeTap();

    expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/recharge/index' });
  });

  it('navigates from checkout to checkout gift picker', async () => {
    const { page, wx } = await loadPageModule(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts'
    );
    const instance = createPageInstance(page);

    instance.handleGiftTap();

    expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/checkout-gifts/index' });
  });
});
