import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MERCHANT_SESSION_STORAGE_KEY } from '../services/api-client';

type PageOptions = Record<string, any> & {
  data: Record<string, unknown>;
};

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function loadPageModule(modulePath: string) {
  const storage = new Map<string, unknown>();
  let capturedPage: PageOptions | null = null;
  const wxMock = {
    request: vi.fn((options: { fail?: (error: unknown) => void }) => {
      options.fail?.({ errMsg: 'request:fail network down' });
    }),
    getStorageSync: vi.fn((key: string) =>
      key === MERCHANT_SESSION_STORAGE_KEY
        ? {
            token: 'merchant-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
            account: {
              id: 'acct-admin',
              username: 'admin',
              role: 'admin',
              mustChangePassword: false
            }
          }
        : storage.get(key)
    ),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
    showToast: vi.fn(),
    navigateBack: vi.fn(),
    navigateTo: vi.fn(),
    redirectTo: vi.fn(),
    reLaunch: vi.fn()
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
  const instance: Record<string, any> = {
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
    if (key !== 'data') {
      instance[key] = typeof value === 'function' ? value.bind(instance) : value;
    }
  });

  return instance;
}

describe('merchant page API resilience', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('unblocks the product list when merchant catalog requests fail', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/products/index.ts');
    const instance = createPageInstance(page);

    await expect(instance.refreshProducts()).resolves.toBeUndefined();

    expect(instance.data.loading).toBe(false);
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '商品加载失败',
      icon: 'none'
    });
  });

  it('skips the login form when a fresh merchant session already exists', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/access-gate/index.ts');
    const instance = createPageInstance(page);

    instance.onShow();

    expect(wx.redirectTo).toHaveBeenCalledWith({
      url: '/pages/workspace/index'
    });
  });

  it('clears the merchant token when logging out from the workspace', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/workspace/index.ts');
    const instance = createPageInstance(page);

    instance.handleLogoutTap();

    expect(wx.removeStorageSync).toHaveBeenCalledWith(MERCHANT_SESSION_STORAGE_KEY);
    expect(wx.reLaunch).toHaveBeenCalledWith({
      url: '/pages/access-gate/index'
    });
  });

  it('unblocks runtime config when section loading fails', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/runtime-config/index.ts');
    const instance = createPageInstance(page);

    await expect(instance.refreshSections()).resolves.toBeUndefined();

    expect(instance.data.loading).toBe(false);
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '配置加载失败',
      icon: 'none'
    });
  });

  it('unblocks the merchant user list when user requests fail', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/users/index.ts');
    const instance = createPageInstance(page);

    await expect(instance.refreshUsers()).resolves.toBeUndefined();

    expect(instance.data.loading).toBe(false);
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '用户加载失败',
      icon: 'none'
    });
  });

  it('unblocks staff disable when the account request fails', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/staff-accounts/index.ts');
    const instance = createPageInstance(page);

    await expect(
      instance.handleDisableStaff({
        currentTarget: {
          dataset: {
            id: 'staff-001'
          }
        }
      })
    ).resolves.toBeUndefined();

    expect(instance.data.loading).toBe(false);
    expect(instance.data.statusText).toBe('request:fail network down');
  });

  it('unblocks staff password reset when the account request fails', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/staff-accounts/index.ts');
    const instance = createPageInstance(page);

    await expect(
      instance.handleResetPassword({
        currentTarget: {
          dataset: {
            id: 'staff-001'
          }
        }
      })
    ).resolves.toBeUndefined();

    expect(instance.data.loading).toBe(false);
    expect(instance.data.statusText).toBe('request:fail network down');
  });

  it('unblocks product editor save when the save request fails', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/product-editor/index.ts');
    const instance = createPageInstance(page);
    instance.setData({
      saving: false,
      activeStep: 'publishSettings',
      draft: {
        basicInfo: {
          productId: 'product-001',
          name: '海洋派对',
          description: '生日蛋糕',
          categoryId: 'cakes',
          imageFileId: 'oss://bucket/product-001.png',
          imagePreviewUrl: 'https://img.example/product-001.png',
          memberLevelId: null,
          stock: 10
        },
        pricing: {
          basePrice: 128,
          specs: [],
          formulas: [],
          overrides: [],
          purchaseLimit: {
            enabled: false,
            maxQuantity: null
          },
          detailContent: ''
        },
        publishSettings: {
          status: 'published',
          fulfillmentModes: ['delivery'],
          trackInventory: true
        }
      }
    });

    await expect(instance.handleStepSubmit()).resolves.toBeUndefined();

    expect(instance.data.saving).toBe(false);
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '保存失败',
      icon: 'none'
    });
  });
});
