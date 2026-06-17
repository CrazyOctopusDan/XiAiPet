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
  const storage = new Map<string, unknown>();
  let capturedPage: PageOptions | null = null;
  const wxMock = {
    login: vi.fn().mockResolvedValue({ code: 'wx-login-code' }),
    request: vi.fn(),
    requestPayment: vi.fn(),
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
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

  it('formats my gift expiration times for display', async () => {
    const { page, wx } = await loadPageModule(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/my-gifts/index.ts'
    );
    wx.request.mockImplementation((options: any) => {
      const path = new URL(options.url).pathname;

      if (path === '/api/v1/customer/auth/login') {
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            token: 'customer-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
            openid: 'session-openid'
          }
        });
        return;
      }

      if (path === '/api/v1/customer/gifts') {
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            groups: {
              available: [
                {
                  id: 'gift-1',
                  status: 'available',
                  displayGroup: 'available',
                  giftSnapshot: {
                    name: '生日蛋糕',
                    description: '一年内可兑换',
                    validDays: 365
                  },
                  expiresAt: '2027-06-16T00:09:10.000Z'
                }
              ],
              locked: [],
              redeemed: [],
              expired: []
            }
          }
        });
      }
    });
    const instance = createPageInstance(page);

    await instance.refreshGifts();

    expect(instance.data.sections[0].items[0].displayExpiresAt).toBe('2027-06-16 08:09:10');
    expect(instance.data.sections[0].items[0].expiresAt).toBe('2027-06-16T00:09:10.000Z');
  });

  it('keeps recharge idempotency key stable when payment is cancelled and retried', async () => {
    const idempotencyKeys: string[] = [];
    const { page, wx } = await loadPageModule(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/recharge/index.ts'
    );
    wx.request.mockImplementation((options: any) => {
      const path = new URL(options.url).pathname;

      if (path === '/api/v1/customer/auth/login') {
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            token: 'customer-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
            openid: 'session-openid'
          }
        });
        return;
      }

      if (path === '/api/v1/customer/recharge-transactions') {
        idempotencyKeys.push(options.data.idempotencyKey);
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            transaction: {
              id: `recharge-${idempotencyKeys.length}`,
              planId: options.data.planId,
              planSnapshot: {
                planId: options.data.planId,
                enabled: true,
                paidAmount: 100,
                bonusAmount: 10,
                description: '测试充值',
                gifts: [],
                purchasedAt: '2026-06-16T00:00:00.000Z'
              },
              paidAmount: 100,
              bonusAmount: 10,
              status: 'pending'
            },
            paymentStatus: 'pending_wechat',
            paymentParams: {
              timeStamp: '1',
              nonceStr: 'nonce',
              package: 'prepay_id=1',
              signType: 'RSA',
              paySign: 'sign'
            }
          }
        });
      }
    });
    wx.requestPayment.mockImplementation((options: any) => {
      options.fail?.({ errMsg: 'requestPayment:fail cancel' });
    });
    const instance = createPageInstance(page);

    instance.onLoad();
    instance.setData({
      selectedPlanId: 'plan-100',
      submitting: false
    });
    await instance.handleSubmitRecharge();
    await instance.handleSubmitRecharge();

    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
  });

  it('rotates recharge idempotency key when switching plans after a cancelled payment', async () => {
    const submissions: Array<{ planId: string; idempotencyKey: string }> = [];
    const { page, wx } = await loadPageModule(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/recharge/index.ts'
    );
    wx.request.mockImplementation((options: any) => {
      const path = new URL(options.url).pathname;

      if (path === '/api/v1/customer/auth/login') {
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            token: 'customer-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
            openid: 'session-openid'
          }
        });
        return;
      }

      if (path === '/api/v1/customer/recharge-plans') {
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            plans: [
              {
                planId: 'plan-a',
                enabled: true,
                paidAmount: 100,
                bonusAmount: 10,
                description: '方案 A',
                gifts: []
              },
              {
                planId: 'plan-b',
                enabled: true,
                paidAmount: 200,
                bonusAmount: 30,
                description: '方案 B',
                gifts: []
              }
            ]
          }
        });
        return;
      }

      if (path === '/api/v1/customer/recharge-transactions') {
        submissions.push({
          planId: options.data.planId,
          idempotencyKey: options.data.idempotencyKey
        });
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            transaction: {
              id: `recharge-${submissions.length}`,
              planId: options.data.planId,
              planSnapshot: {
                planId: options.data.planId,
                enabled: true,
                paidAmount: options.data.planId === 'plan-a' ? 100 : 200,
                bonusAmount: options.data.planId === 'plan-a' ? 10 : 30,
                description: options.data.planId === 'plan-a' ? '方案 A' : '方案 B',
                gifts: [],
                purchasedAt: '2026-06-16T00:00:00.000Z'
              },
              paidAmount: options.data.planId === 'plan-a' ? 100 : 200,
              bonusAmount: options.data.planId === 'plan-a' ? 10 : 30,
              status: 'pending'
            },
            paymentStatus: 'pending_wechat',
            paymentParams: {
              timeStamp: '1',
              nonceStr: 'nonce',
              package: 'prepay_id=1',
              signType: 'RSA',
              paySign: 'sign'
            }
          }
        });
      }
    });
    wx.requestPayment.mockImplementation((options: any) => {
      options.fail?.({ errMsg: 'requestPayment:fail cancel' });
    });
    const instance = createPageInstance(page);

    instance.onLoad();
    await instance.refreshPlans();
    await instance.handleSubmitRecharge();
    instance.handlePlanTap({
      currentTarget: {
        dataset: {
          planId: 'plan-b'
        }
      }
    });
    await instance.handleSubmitRecharge();

    expect(submissions.map((item) => item.planId)).toEqual(['plan-a', 'plan-b']);
    expect(submissions[1].idempotencyKey).not.toBe(submissions[0].idempotencyKey);
  });

  it('resets stale checkout gift selection on a new checkout load', async () => {
    const { page } = await loadPageModule(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts'
    );
    const giftsService = await import('../src/services/gifts');
    await giftsService.hydrateCheckoutGifts(async <T>() => ({
      ok: true,
      gifts: [
        {
          id: 'gift-1',
          status: 'available',
          displayGroup: 'available',
          giftSnapshot: {
            name: '生日蛋糕',
            description: '订单可兑换',
            validDays: 30
          },
          expiresAt: '2026-07-16T00:00:00.000Z'
        }
      ]
    }) as T);
    giftsService.toggleCheckoutGiftSelection('gift-1');
    const instance = createPageInstance(page);

    instance.onLoad();

    expect(instance.data.selectedGiftCount).toBe(0);
    expect(instance.data.selectedGiftSummary).toEqual([]);
    expect(giftsService.getSelectedCheckoutGiftIds()).toEqual([]);
  });
});
