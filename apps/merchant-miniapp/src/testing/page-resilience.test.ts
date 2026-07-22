import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

import { MERCHANT_SESSION_STORAGE_KEY } from '../services/api-client';

type PageOptions = Record<string, any> & {
  data: Record<string, unknown>;
};

interface WxRequestOptions {
  url?: string;
  method?: string;
  success?: (response: unknown) => void;
  fail?: (error: unknown) => void;
}

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function loadPageModule(modulePath: string) {
  const storage = new Map<string, unknown>();
  let capturedPage: PageOptions | null = null;
  const wxMock = {
    request: vi.fn((options: WxRequestOptions) => {
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

function createOrderDetailFixture() {
  return {
    id: 'order-001',
    openid: 'customer-openid',
    status: 'paid',
    paymentMethod: 'balance',
    payment: {
      method: 'balance',
      status: 'paid'
    },
    fulfillmentState: {
      mode: 'delivery',
      status: 'pending',
      updatedAt: '2026-06-25T03:20:00.000Z'
    },
    pricing: {
      itemsSubtotal: 96,
      deliveryFee: 60,
      payableTotal: 156
    },
    snapshot: {
      fulfillment: {
        mode: 'delivery',
        address: {
          id: 'address-001',
          recipientName: 'Cookie大爹',
          phoneNumber: '18811736099',
          regionLabel: '浙江省嘉兴市南湖区',
          detailAddress: '留香名苑17幢805',
          tag: '家'
        },
        reservation: {
          dateValue: '2026-06-25',
          dateLabel: '今天 06-25',
          timeValue: '13:30',
          timeLabel: '13:30'
        },
        store: {
          name: '喜爱宠物烘焙',
          address: '嘉兴'
        }
      },
      items: [
        {
          productId: 'product-001',
          name: '香烘新西兰猪蛋蛋',
          quantity: 6,
          unitPrice: 16,
          specId: '',
          specLabel: '',
          lineTotal: 96
        }
      ],
      pets: [],
      remark: ''
    },
    createdAt: '2026-06-25T03:20:00.000Z',
    updatedAt: '2026-06-25T03:20:00.000Z'
  };
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

  it('uses backend category product counts instead of first-page product counts', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/categories/index.ts');
    wx.request.mockImplementation((options: WxRequestOptions) => {
      if (options.url?.includes('/api/v1/merchant/categories')) {
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            categories: [
              {
                id: 'category-001',
                name: '新',
                iconToken: '新',
                createdAt: '2026-06-09T00:00:00.000Z',
                updatedAt: '2026-06-09T00:00:00.000Z',
                linkedProductCount: 28,
                canDelete: false
              }
            ]
          }
        });
        return;
      }

      options.success?.({
        statusCode: 200,
        data: {
          ok: true,
          items: Array.from({ length: 20 }, (_, index) => ({
            id: `product-${index}`,
            categoryId: 'category-001'
          }))
        }
      });
    });
    const instance = createPageInstance(page);

    await expect(instance.refreshCategories()).resolves.toBeUndefined();

    expect(instance.data.summary).toMatchObject({
      linkedProducts: 28,
      lockedCategories: 1
    });
    expect(instance.data.cards[0]).toMatchObject({
      linkedProductCountLabel: '28 个商品',
      deleteActionLabel: '先迁移商品'
    });
    expect(wx.request).toHaveBeenCalledTimes(1);
    expect(wx.request.mock.calls[0]?.[0].url).toContain('/api/v1/merchant/categories');
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

  it('ignores repeated order status submissions while the first update is pending', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/order-detail/index.ts');
    const order = createOrderDetailFixture();
    const statusRequests: WxRequestOptions[] = [];

    wx.request.mockImplementation((options: WxRequestOptions) => {
      if (options.url?.includes('/api/v1/merchant/orders/order-001/status')) {
        statusRequests.push(options);
        if (statusRequests.length === 1) {
          return;
        }
        options.success?.({
          statusCode: 409,
          data: {
            ok: false,
            code: 'ORDER_TERMINAL',
            message: 'Terminal order cannot be updated'
          }
        });
        return;
      }

      if (options.url?.includes('/api/v1/merchant/orders/order-001')) {
        options.success?.({
          statusCode: 200,
          data: {
            ok: true,
            order,
            timeline: []
          }
        });
        return;
      }

      options.fail?.({ errMsg: 'request:fail unexpected request' });
    });

    const instance = createPageInstance(page);
    instance.onLoad({ orderId: 'order-001' });
    await instance.refreshDetail();
    instance.handleOpenStatusDrawer();
    instance.handleStatusOptionTap({
      currentTarget: {
        dataset: {
          value: 'cancelled'
        }
      }
    });

    const firstSubmit = instance.handleSubmitStatus();
    const secondSubmit = instance.handleSubmitStatus();

    await Promise.resolve();
    await Promise.resolve();

    expect(statusRequests).toHaveLength(1);
    const firstStatusRequest = statusRequests[0];
    if (!firstStatusRequest) {
      throw new Error('missing first status request');
    }
    firstStatusRequest.success?.({
      statusCode: 200,
      data: {
        ok: true,
        order: {
          ...order,
          status: 'cancelled',
          fulfillmentState: {
            ...order.fulfillmentState,
            status: 'cancelled'
          },
          updatedAt: '2026-06-25T03:21:00.000Z'
        }
      }
    });

    await Promise.all([firstSubmit, secondSubmit]);
  });

  it('uses the same gift rendering for active orders, packing details, and history orders', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/orders/index.ts');
    const instance = createPageInstance(page);
    const listTemplate = readFileSync(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/orders/index.wxml',
      'utf8'
    );
    const detailTemplate = readFileSync(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/order-detail/index.wxml',
      'utf8'
    );

    instance.onLoad({ scope: 'history' });

    expect(instance.data).toMatchObject({
      scope: 'history',
      pageTitle: '历史订单',
      summaryOrderLabel: '历史订单'
    });
    expect(listTemplate).toContain('wx:if="{{order.hasGifts}}"');
    expect(listTemplate).toContain('{{order.giftSummaryLabel}}');
    expect(detailTemplate).toContain('wx:if="{{detail.hasGifts}}"');
    expect(detailTemplate).toContain('{{detail.gifts}}');
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

  it('keeps product money inputs within two decimal places', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/product-editor/index.ts');
    const instance = createPageInstance(page);
    instance.setData({
      draft: {
        ...instance.data.draft,
        pricing: {
          ...instance.data.draft.pricing,
          specs: [
            {
              id: 'spec-1',
              label: '4 inch',
              surcharge: 0
            }
          ],
          formulas: [
            {
              id: 'formula-1',
              label: 'Chicken',
              surcharge: 0
            }
          ]
        }
      }
    });

    instance.handleBasePriceInput({ detail: { value: '128.129' } });
    instance.handleSpecInput({
      currentTarget: { dataset: { index: '0', field: 'surcharge' } },
      detail: { value: '10.999' }
    });
    instance.handleFormulaInput({
      currentTarget: { dataset: { index: '0', field: 'surcharge' } },
      detail: { value: '6.666' }
    });

    expect(instance.data.draft.pricing.basePrice).toBe(128.12);
    expect(instance.data.draft.pricing.specs[0].surcharge).toBe(10.99);
    expect(instance.data.draft.pricing.formulas[0].surcharge).toBe(6.66);
  });

  it('does not truncate money inputs affected by binary floating point precision', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/product-editor/index.ts');
    const instance = createPageInstance(page);

    instance.handleBasePriceInput({ detail: { value: '32.80' } });

    expect(instance.data.draft.pricing.basePrice).toBe(32.8);
  });

  it('does not overwrite an in-progress decimal point while editing prices', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/product-editor/index.ts');
    const instance = createPageInstance(page);
    instance.setData({
      draft: {
        ...instance.data.draft,
        pricing: {
          ...instance.data.draft.pricing,
          basePrice: 128,
          specs: [
            {
              id: 'spec-1',
              label: '4 inch',
              surcharge: 10
            }
          ],
          formulas: [
            {
              id: 'formula-1',
              label: 'Chicken',
              surcharge: 6
            }
          ]
        }
      }
    });
    const setData = vi.spyOn(instance, 'setData');

    const baseResult = instance.handleBasePriceInput({ detail: { value: '128.' } });
    const specResult = instance.handleSpecInput({
      currentTarget: { dataset: { index: '0', field: 'surcharge' } },
      detail: { value: '10.' }
    });
    const formulaResult = instance.handleFormulaInput({
      currentTarget: { dataset: { index: '0', field: 'surcharge' } },
      detail: { value: '6.' }
    });

    expect(baseResult).toBe('128.');
    expect(specResult).toBe('10.');
    expect(formulaResult).toBe('6.');
    expect(instance.data.draft.pricing.basePrice).toBe(128);
    expect(instance.data.draft.pricing.specs[0].surcharge).toBe(10);
    expect(instance.data.draft.pricing.formulas[0].surcharge).toBe(6);
    expect(setData).not.toHaveBeenCalled();
  });

  it('normalizes merchant balance amount input without dropping decimals', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/user-detail/index.ts');
    const instance = createPageInstance(page);
    instance.setData({
      user: {
        openid: 'openid-1',
        avatarUrl: '',
        nickname: 'Cookie大爹',
        contactPhoneMasked: '188****6099',
        contactPhone: '18811736099',
        membershipTierLabel: '普通会员',
        currentBalance: 188
      },
      note: '门店充值'
    });

    expect(instance.handleAmountInput({ detail: { value: '50.' } })).toBe('50.');
    expect(instance.data.amountText).toBe('50.');
    expect(instance.handleAmountInput({ detail: { value: '50.999' } })).toBe('50.99');
    expect(instance.data.amountText).toBe('50.99');
    expect(instance.data.resultingBalanceLabel).toBe('￥238.99');
  });

  it('normalizes runtime-config money inputs to two decimal places', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/runtime-config/index.ts');
    const instance = createPageInstance(page);
    instance.setData({
      sections: [
        {
          sectionId: 'membership-tiers',
          updatedAt: '2026-05-27T00:00:00.000Z',
          updatedBy: {
            openid: 'merchant',
            name: '店主'
          },
          value: {
            tiers: [
              {
                tierId: 'vip',
                threshold: 0,
                name: '金卡会员',
                description: '充值门槛'
              }
            ]
          }
        }
      ],
      dirty: {},
      deliveryEditorDraft: {
        distanceKm: '',
        minimumOrderAmount: '',
        deliveryFee: ''
      }
    });

    expect(instance.handleDeliveryEditorInput({
      currentTarget: { dataset: { field: 'minimumOrderAmount' } },
      detail: { value: '98.999' }
    })).toBe('98.99');
    expect(instance.handleDeliveryEditorInput({
      currentTarget: { dataset: { field: 'deliveryFee' } },
      detail: { value: '12.' }
    })).toBe('12.');
    expect(instance.data.deliveryEditorDraft.minimumOrderAmount).toBe('98.99');
    expect(instance.data.deliveryEditorDraft.deliveryFee).toBe('12.');

    expect(instance.handleMembershipInput({
      currentTarget: { dataset: { index: '0', field: 'threshold' } },
      detail: { value: '500.999' }
    })).toBe('500.99');
    expect(instance.data.sections[0].value.tiers[0].threshold).toBe(500.99);
  });

  it('uses decimal keyboard inputs for product prices', () => {
    const wxml = readFileSync('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/product-editor/index.wxml', 'utf8');

    expect(wxml).toContain('type="digit" placeholder="基准价格" value="{{draft.pricing.basePrice}}"');
    expect(wxml).toContain('data-field="surcharge" type="digit" placeholder="加价"');
    expect(wxml).not.toMatch(/type="number" placeholder="基准价格"|data-field="surcharge" type="number" placeholder="加价"/);
    expect(wxml.match(/type="digit"/g)).toHaveLength(3);
  });

  it('right-aligns product editor add buttons in line headers', () => {
    const wxss = readFileSync('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/product-editor/index.wxss', 'utf8');

    expect(wxss).toContain('.line-editor-head .mini-button');
    expect(wxss).toContain('margin-left: auto;');
    expect(wxss).toContain('margin-right: 0;');
  });

  it('uses decimal keyboard inputs for merchant balance adjustments', () => {
    const wxml = readFileSync('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/user-detail/index.wxml', 'utf8');

    expect(wxml).toContain('class="field-input" type="digit" placeholder="调整金额"');
    expect(wxml).toContain('wx:for="{{detail.petRows}}"');
    expect(wxml).toContain('{{item.genderLabel}}');
    expect(wxml).toContain('{{item.allergyNotesLabel}}');
    expect(wxml).toContain('wx:for="{{reasonOptions}}"');
    expect(wxml).not.toContain('class="field-input" type="number"');
    expect(wxml).not.toContain('data-action="set"');
    expect(wxml).not.toContain('指定余额');
    expect(wxml).not.toContain('人工纠错');
    expect(wxml).not.toContain('补偿');
  });

  it('uses decimal keyboard inputs for runtime-config money fields', () => {
    const wxml = readFileSync('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/runtime-config/index.wxml', 'utf8');

    expect(wxml).toContain('data-field="threshold" type="digit"');
    expect(wxml).toContain('data-field="minimumOrderAmount"');
    expect(wxml).toContain('data-field="deliveryFee"');
  });
});
