import { beforeEach, describe, expect, it, vi } from 'vitest';

type PageOptions = Record<string, unknown> & {
  data: Record<string, unknown>;
};

type TestPageInstance = {
  data: Record<string, any>;
  setData: (updates: Record<string, unknown>, callback?: () => void) => void;
};

type PrivacyResolve = (result: { event: string; buttonId?: string }) => void;

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

function createCheckoutApiOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-001',
    openid: 'session-openid',
    status: 'paid',
    paymentMethod: 'balance',
    payment: {
      method: 'balance',
      status: 'paid'
    },
    pricing: {
      itemsSubtotal: 36,
      deliveryFee: 0,
      payableTotal: 36
    },
    snapshot: {
      fulfillment: {
        mode: 'delivery',
        store: {
          name: '虾衣宠物烘焙工作室',
          address: '上海市静安区南京西路 1266 号 8 楼'
        }
      },
      items: [],
      pets: [],
      remark: ''
    },
    createdAt: '2026-04-17T10:00:00.000Z',
    updatedAt: '2026-04-17T10:01:00.000Z',
    ...overrides
  };
}

function createDefaultRequestMock() {
  return vi.fn((options) => {
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
    if (path === '/api/v1/customer/runtime-config') {
      respondApi(options, {
        ok: true,
        banner: null,
        store: null,
        customNotice: null,
        deliveryRules: null
      });
      return;
    }
    if (path === '/api/v1/customer/profile/phone') {
      respondApi(options, {
        ok: true,
        update: {
          contactPhoneMasked: '138****1234'
        }
      });
      return;
    }
    if (path === '/api/v1/customer/orders' && options.method === 'POST') {
      respondApi(options, {
        ok: true,
        order: createCheckoutApiOrder({
          status: 'pending_payment',
          payment: {
            method: options.data?.paymentMethod ?? 'balance',
            status: 'pending'
          }
        })
      });
      return;
    }
    if (path === '/api/v1/customer/orders/order-001/payment') {
      respondApi(options, {
        ok: true,
        paymentStatus: 'paid',
        order: createCheckoutApiOrder()
      });
      return;
    }
    if (path === '/api/v1/customer/orders/order-001/payment-sync') {
      respondApi(options, {
        ok: true,
        order: createCheckoutApiOrder()
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
  });
}

async function loadPageModule(modulePath: string) {
  const storage = new Map<string, unknown>();
  let capturedPage: PageOptions | null = null;
  let privacyAuthorizationListener: ((resolve: PrivacyResolve, eventInfo?: { referrer?: string }) => void) | null = null;
  const wxMock = {
    login: vi.fn().mockResolvedValue({ code: 'wx-login-code' }),
    request: createDefaultRequestMock(),
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
    getPrivacySetting: vi.fn(),
    requirePrivacyAuthorize: vi.fn(),
    onNeedPrivacyAuthorization: vi.fn((listener: (resolve: PrivacyResolve, eventInfo?: { referrer?: string }) => void) => {
      privacyAuthorizationListener = listener;
    }),
    triggerNeedPrivacyAuthorization(resolve: PrivacyResolve, eventInfo?: { referrer?: string }) {
      privacyAuthorizationListener?.(resolve, eventInfo);
    },
    showToast: vi.fn(),
    showModal: vi.fn(),
    chooseLocation: vi.fn(),
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
    redirectTo: vi.fn(),
    switchTab: vi.fn(),
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

describe('cart checkout flow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('keeps the cart page aligned with the refreshed yellow-first layout', async () => {
    const { readFile } = await import('node:fs/promises');
    const cartTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.wxml',
      'utf8'
    );
    const cartStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.wxss',
      'utf8'
    );

    expect(cartTemplate).toContain('class="checkbox {{isAllSelected ? \'active\' : \'\'}}"');
    expect(cartTemplate).toContain('尺寸和口味选择');
    expect(cartTemplate).not.toContain('row-spec-arrow');
    expect(cartStyles).toContain('linear-gradient(180deg, #FFFDF5 0%, #FFF9DF 58%, #F6E396 100%)');
    expect(cartStyles).toContain('.checkbox.active::after');
    expect(cartStyles).toMatch(/\.cart-row \{[\s\S]*?background: #FFFFFF/);
    expect(cartStyles).toContain('.stepper-btn::before');
    expect(cartStyles).toContain('.stepper-btn.plus::after');
    expect(cartStyles).toMatch(/\.stepper-btn \{[\s\S]*?font-size: 0/);
    expect(cartStyles).toContain('background: #F6E396');
    expect(cartStyles).toContain('color: #40535C');
    expect(cartStyles).toContain('padding: calc(96rpx + env(safe-area-inset-top)) 24rpx calc(96rpx + env(safe-area-inset-bottom))');
    expect(cartStyles).toContain('.checkout-button::after');
  });

  it('clears cart page items and summary when the user empties the cart', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    clearCart();

    const directProduct = getProductById('sea-sponge');
    const specProduct = getProductById('ocean-party');

    if (!directProduct || !specProduct) {
      throw new Error('missing product fixtures');
    }

    addCartItem(directProduct, '', 1);
    addCartItem(specProduct, specProduct.specs[0]?.id ?? '', 1);

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.items).toHaveLength(2);
    expect(instance.data.selectedCount).toBe(2);

    instance.handleClearCart();

    expect(instance.data.items).toHaveLength(0);
    expect(instance.data.selectedCount).toBe(0);
    expect(instance.data.selectedTotalPrice).toBe(0);
    expect(instance.data.cartCount).toBe(0);
  });

  it('navigates from cart checkout into the checkout handoff page', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { updateProfile } = await import('../src/services/profile');

    clearCart();
    updateProfile({ contactPhoneMasked: '138****1234' });

    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 1);

    const instance = createPageInstance(page);
    instance.onShow();
    await instance.handleCheckout();

    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/checkout/index?source=cart'
    });
  });

  it('hydrates the server profile before blocking checkout for a locally empty phone state', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { resetProfile } = await import('../src/services/profile');

    clearCart();
    resetProfile();

    const defaultRequest = createDefaultRequestMock();
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/profile') {
        respondApi(options, {
          ok: true,
          profile: {
            nickname: 'Cookie大爹',
            contactPhoneMasked: '188****6099',
            contactPhone: '18811736099'
          }
        });
        return;
      }

      defaultRequest(options);
    });

    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 1);

    const instance = createPageInstance(page);
    instance.onShow();
    await instance.handleCheckout();

    expect(wx.showModal).not.toHaveBeenCalled();
    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/checkout/index?source=cart'
    });
  });

  it('prompts unregistered cart users to complete profile before checkout', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    clearCart();
    wx.showModal = vi.fn().mockResolvedValueOnce({ confirm: true, cancel: false });

    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 1);

    const instance = createPageInstance(page);
    instance.onShow();
    await instance.handleCheckout();

    expect(wx.showModal).toHaveBeenCalledWith({
      title: '请先完善用户信息',
      content: '绑定手机号才可以成为我们的会员，享受店内服务。',
      confirmText: '去完善',
      cancelText: '稍后再说',
      confirmColor: '#40535C'
    });
    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/profile-detail/index?redirect=%2Fpages%2Fcart%2Findex'
    });
  });

  it('blocks checkout after deselecting all cart items', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { readFile } = await import('node:fs/promises');

    clearCart();

    const firstProduct = getProductById('sea-sponge');
    const secondProduct = getProductById('ocean-party');

    if (!firstProduct || !secondProduct) {
      throw new Error('missing checkout block fixtures');
    }

    addCartItem(firstProduct, '', 1);
    addCartItem(secondProduct, secondProduct.specs[0]?.id ?? '', 1);

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.selectedCount).toBe(2);
    expect(instance.data.isAllSelected).toBe(true);

    instance.handleToggleAll();

    expect(instance.data.selectedCount).toBe(0);
    expect(instance.data.selectedTotalPrice).toBe(0);
    expect(instance.data.isAllSelected).toBe(false);

    const cartTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.wxml',
      'utf8'
    );

    expect(cartTemplate).toContain('disabled="{{!selectedCount || !canCheckoutSelectedItems}}"');

    instance.handleCheckout();

    expect(wx.showToast).toHaveBeenCalledWith({
      title: '请选择商品',
      icon: 'none'
    });
    expect(wx.navigateTo).not.toHaveBeenCalled();
  });

  it('groups incompatible fulfillment items and blocks mixed checkout selections', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart, getCartItems, updateCartItemSelection } = await import('../src/services/cart');

    clearCart();

    const baseProduct = getProductById('sea-sponge');
    const specProduct = getProductById('ocean-party');

    if (!baseProduct || !specProduct) {
      throw new Error('missing cart fulfillment fixtures');
    }

    addCartItem({ ...baseProduct, id: 'delivery-only', deliveryModes: ['delivery'] }, '', 1);
    addCartItem({ ...specProduct, id: 'pickup-only', deliveryModes: ['pickup'] }, specProduct.specs[0]?.id ?? '', 1);

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.itemGroups.map((group: { label: string }) => group.label)).toEqual(['仅配送', '仅自取']);
    expect(instance.data.canCheckoutSelectedItems).toBe(false);
    expect(instance.data.fulfillmentWarning).toBe('请选择支持同一种履约方式的商品一起结算');

    instance.handleCheckout();

    expect(wx.showToast).toHaveBeenCalledWith({
      title: '请选择同一履约方式的商品',
      icon: 'none'
    });
    expect(wx.navigateTo).not.toHaveBeenCalled();

    updateCartItemSelection(getCartItems()[1]!.id, false);
    instance.refreshCart();

    expect(instance.data.canCheckoutSelectedItems).toBe(true);
    expect(instance.data.fulfillmentWarning).toBe('');
  });

  it('keeps the edited cart row in place when a spec update merges into another row', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    clearCart();

    const fillerProduct = getProductById('sea-sponge');
    const specProduct = getProductById('ocean-party');

    if (!fillerProduct || !specProduct || specProduct.specs.length < 2) {
      throw new Error('missing cart spec fixtures');
    }

    addCartItem(fillerProduct, '', 1);
    addCartItem(specProduct, specProduct.specs[0]!.id, 1);
    addCartItem(specProduct, specProduct.specs[1]!.id, 1);

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.items.map((item: { id: string }) => item.id)).toEqual([
      `${fillerProduct.id}::default`,
      `${specProduct.id}::${specProduct.specs[0]!.id}`,
      `${specProduct.id}::${specProduct.specs[1]!.id}`
    ]);

    instance.handleOpenSpecModal({
      currentTarget: {
        dataset: {
          itemId: `${specProduct.id}::${specProduct.specs[1]!.id}`
        }
      }
    });
    instance.handleEditingSpecTap({
      currentTarget: {
        dataset: {
          specId: specProduct.specs[0]!.id
        }
      }
    });
    instance.handleConfirmSpec();

    expect(instance.data.items.map((item: { id: string }) => item.id)).toEqual([
      `${fillerProduct.id}::default`,
      `${specProduct.id}::${specProduct.specs[0]!.id}`
    ]);
    expect(instance.data.items[1]).toMatchObject({
      id: `${specProduct.id}::${specProduct.specs[0]!.id}`,
      quantity: 2
    });
  });

  it('shows a stock warning and keeps the original row when a spec update would exceed stock', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    clearCart();

    const specProduct = getProductById('ocean-party');

    if (!specProduct || specProduct.specs.length < 2) {
      throw new Error('missing stock warning fixtures');
    }

    addCartItem(specProduct, specProduct.specs[0]!.id, 1);
    addCartItem(specProduct, specProduct.specs[1]!.id, specProduct.stock);

    const instance = createPageInstance(page);
    instance.onShow();

    const beforeItems = instance.data.items.map((item: { id: string; quantity: number }) => ({
      id: item.id,
      quantity: item.quantity
    }));

    instance.handleOpenSpecModal({
      currentTarget: {
        dataset: {
          itemId: `${specProduct.id}::${specProduct.specs[0]!.id}`
        }
      }
    });
    instance.handleEditingSpecTap({
      currentTarget: {
        dataset: {
          specId: specProduct.specs[1]!.id
        }
      }
    });
    instance.handleConfirmSpec();

    expect(wx.showToast).toHaveBeenCalledWith({
      title: '库存不足，请看看别的吧~',
      icon: 'none'
    });
    expect(instance.data.items.map((item: { id: string; quantity: number }) => ({
      id: item.id,
      quantity: item.quantity
    }))).toEqual(beforeItems);
  });

  it('reveals one swipe-delete row at a time, allows right-swipe collapse, and only deletes after confirmation', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    clearCart();

    const directProduct = getProductById('sea-sponge');
    const specProduct = getProductById('ocean-party');

    if (!directProduct || !specProduct) {
      throw new Error('missing swipe delete fixtures');
    }

    addCartItem(directProduct, '', 1);
    addCartItem(specProduct, specProduct.specs[0]?.id ?? '', 1);

    const instance = createPageInstance(page);
    instance.onShow();

    const firstItemId = `${directProduct.id}::default`;
    const secondItemId = `${specProduct.id}::${specProduct.specs[0]!.id}`;

    instance.handleRowSwipeStart({
      currentTarget: { dataset: { itemId: firstItemId } },
      touches: [{ clientX: 200 }]
    });
    instance.handleRowSwipeMove({
      currentTarget: { dataset: { itemId: firstItemId } },
      touches: [{ clientX: 140 }]
    });

    expect(instance.data.swipedItemId).toBe(firstItemId);

    instance.handleRowSwipeStart({
      currentTarget: { dataset: { itemId: secondItemId } },
      touches: [{ clientX: 220 }]
    });
    instance.handleRowSwipeMove({
      currentTarget: { dataset: { itemId: secondItemId } },
      touches: [{ clientX: 150 }]
    });

    expect(instance.data.swipedItemId).toBe(secondItemId);

    instance.handleRowSwipeStart({
      currentTarget: { dataset: { itemId: secondItemId } },
      touches: [{ clientX: 150 }]
    });
    instance.handleRowSwipeMove({
      currentTarget: { dataset: { itemId: secondItemId } },
      touches: [{ clientX: 212 }]
    });

    expect(instance.data.swipedItemId).toBe('');

    instance.handleRowSwipeStart({
      currentTarget: { dataset: { itemId: secondItemId } },
      touches: [{ clientX: 220 }]
    });
    instance.handleRowSwipeMove({
      currentTarget: { dataset: { itemId: secondItemId } },
      touches: [{ clientX: 150 }]
    });

    expect(instance.data.swipedItemId).toBe(secondItemId);

    wx.showModal = vi.fn().mockResolvedValueOnce({ confirm: false, cancel: true });
    await instance.handleRequestDelete({
      currentTarget: { dataset: { itemId: secondItemId } }
    });

    expect(wx.showModal).toHaveBeenCalledWith({
      title: '删除商品',
      content: '确认把这个商品从购物车中删除吗？',
      confirmText: '删除',
      confirmColor: '#FF3B30'
    });
    expect(instance.data.items.map((item: { id: string }) => item.id)).toEqual([firstItemId, secondItemId]);
    expect(instance.data.swipedItemId).toBe(secondItemId);

    wx.showModal = vi.fn().mockResolvedValueOnce({ confirm: true, cancel: false });
    await instance.handleRequestDelete({
      currentTarget: { dataset: { itemId: secondItemId } }
    });

    expect(instance.data.items.map((item: { id: string }) => item.id)).toEqual([firstItemId]);
    expect(instance.data.swipedItemId).toBe('');
  });

  it('shows only selected cart rows on the checkout handoff page', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart, getCartItems, updateCartItemSelection } = await import('../src/services/cart');

    clearCart();

    const directProduct = getProductById('sea-sponge');
    const specProduct = getProductById('ocean-party');

    if (!directProduct || !specProduct) {
      throw new Error('missing product fixtures');
    }

    addCartItem(directProduct, '', 1);
    addCartItem(specProduct, specProduct.specs[0]?.id ?? '', 2);

    const directRow = getCartItems().find((item) => item.productId === directProduct.id);

    if (!directRow) {
      throw new Error('missing direct row');
    }

    updateCartItemSelection(directRow.id, false);

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.items).toHaveLength(1);
    expect(instance.data.items[0]?.productId).toBe(specProduct.id);
    expect(instance.data.selectedCount).toBe(2);
    expect(instance.data.selectedTotalPrice).toBe(specProduct.specs[0]?.price * 2);
  });

  it('starts each checkout page entry with a fresh draft while keeping selected cart rows', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { createPet, getPets, resetPets } = await import('../src/services/pets');
    const {
      getCheckoutDraft,
      resetCheckoutDraft,
      setCheckoutRemark,
      setCustomNoticeAcknowledged,
      setReservationSelection,
      toggleSelectedPet
    } = await import('../src/services/checkout');

    clearCart();
    resetPets();
    resetCheckoutDraft();

    const product = getProductById('sea-sponge');

    if (!product) {
      throw new Error('missing checkout reset fixture');
    }

    addCartItem(product, '', 1);
    createPet({
      name: '奶油',
      gender: 'female',
      birthday: '2023-04-12',
      allergyNotes: ''
    });
    toggleSelectedPet(getPets()[0]!.id);
    setReservationSelection({
      dateLabel: '今天 04-17',
      dateValue: '2026-04-17',
      timeLabel: '10:30',
      timeValue: '10:30'
    });
    setCheckoutRemark('少放糖');
    setCustomNoticeAcknowledged(true);

    expect(getCheckoutDraft()).toMatchObject({
      remark: '少放糖',
      hasReadCustomNotice: true,
      selectedPetIds: [getPets()[0]!.id]
    });

    const instance = createPageInstance(page);

    expect(instance.onLoad).toEqual(expect.any(Function));
    instance.onLoad({ source: 'cart' });
    instance.onShow();

    expect(getCheckoutDraft()).toMatchObject({
      reservationSelection: null,
      remark: '',
      hasReadCustomNotice: false,
      selectedPetIds: []
    });
    expect(instance.data.items).toHaveLength(1);
    expect(instance.data.selectedReservationValue).toBe('');
    expect(instance.data.remarkSummary).toBe('还没有填写备注');
    expect(instance.data.selectedPetIds).toEqual([]);
  });

  it('keeps checkout submission locked while redirecting after a paid order', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { resetCheckoutDraft, setFulfillmentMode, setReservationSelection } = await import('../src/services/checkout');
    const { resetProfile, updateProfile } = await import('../src/services/profile');

    clearCart();
    resetCheckoutDraft();
    resetProfile();
    updateProfile({
      contactPhone: '13800001234'
    });

    const product = getProductById('sea-sponge');

    if (!product) {
      throw new Error('missing paid redirect fixture');
    }

    const instance = createPageInstance(page);

    instance.onLoad({ source: 'cart' });
    addCartItem(product, '', 1);
    setFulfillmentMode('pickup');
    setReservationSelection({
      dateLabel: '今天 04-17',
      dateValue: '2026-04-17',
      timeLabel: '10:30',
      timeValue: '10:30'
    });
    instance.refreshCheckout();

    expect(instance.data.canSubmit).toBe(true);

    await instance.handleSubmit();

    expect(wx.redirectTo).toHaveBeenCalledWith(expect.objectContaining({
      url: '/pages/order-detail/index?orderId=order-001'
    }));
    expect(instance.data.submitting).toBe(true);
  });

  it('hydrates checkout runtime config from readRuntimeConfig and hides disabled notices', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');

    wx.request.mockImplementationOnce((options) => {
      respondApi(options, {
        ok: true,
        banner: null,
        store: {
          storeName: '喜爱宠物烘焙',
          address: '上海市徐汇区永嘉路 88 号',
          latitude: 31.205,
          longitude: 121.44,
          wechatId: 'xiaipet-vip',
          ownerPhone: '13600000000'
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
      });
    });

    const instance = createPageInstance(page);
    await instance.refreshRuntimeConfig();

    expect(wx.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/api/v1/customer/runtime-config'),
        method: 'GET'
      })
    );
    expect(instance.data.storeAddress).toBe('上海市徐汇区永嘉路 88 号');
    expect(instance.data.customNotice).toBe('');
    expect(instance.data.deliveryRuleRows).toEqual(['5.0 公里内 98 元起送，配送费 0 元']);
  });

  it('shows the selected address summary on the checkout handoff page', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { clearCart } = await import('../src/services/cart');
    const { createAddress, resetAddresses, selectAddress, setCheckoutAddressType } = await import('../src/services/address');

    clearCart();
    resetAddresses();

    const cityAddress = createAddress({
      type: 'city',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '上海市 黄浦区',
      detailAddress: '外滩 18 号 201',
      tag: '公司'
    });

    if (!cityAddress) {
      throw new Error('missing city address fixture');
    }

    setCheckoutAddressType('city');
    selectAddress(cityAddress.id);

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.selectedAddress).toMatchObject({
      id: cityAddress.id,
      recipientName: cityAddress.recipientName,
      type: 'city'
    });
  });

  it('renders the address list without hero copy and keeps the add action fixed above safe area', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-list/index.ts');
    const { resetAddresses } = await import('../src/services/address');
    const { readFile } = await import('node:fs/promises');

    resetAddresses();

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'city' });
    instance.onShow();

    expect(instance.data.activeType).toBe('city');
    expect(instance.data.addresses).toEqual([]);

    const addressTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-list/index.wxml',
      'utf8'
    );
    const addressStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-list/index.wxss',
      'utf8'
    );

    expect(addressTemplate).not.toContain('class="address-hero"');
    expect(addressTemplate).not.toContain('class="address-title"');
    expect(addressTemplate).not.toContain('同城配送和快递地址共用一套地址簿');
    expect(addressTemplate).toContain('class="address-fixed-action"');
    expect(addressTemplate).toContain('class="address-add-button"');
    expect(addressTemplate).toContain('wx:if="{{isCheckoutSelection || selectedAddressId !== item.id}}"');
    expect(addressStyles).toContain('.address-fixed-action');
    expect(addressStyles).toContain('position: fixed');
    expect(addressStyles).toContain('padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom))');
    expect(addressStyles).toContain('padding-bottom: calc(180rpx + env(safe-area-inset-bottom))');
    expect(addressStyles).not.toContain('.address-hero');
    expect(addressStyles).not.toContain('.address-title');
  });

  it('renders the address form with map picking for city delivery coordinates', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    const { readFile } = await import('node:fs/promises');

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'express' });

    expect(instance.data).toMatchObject({
      mode: 'create',
      typeLabel: '快递地址'
    });

    const formTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.wxml',
      'utf8'
    );
    const formStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.wxss',
      'utf8'
    );
    const appConfig = JSON.parse(await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/app.json',
      'utf8'
    ));

    expect(formTemplate).not.toContain('class="address-form-hero"');
    expect(formTemplate).not.toContain('class="address-form-subtitle"');
    expect(formTemplate).toContain('class="address-form-context"');
    expect(formTemplate).toContain('class="address-form-fixed-action"');
    expect(formTemplate).toContain('class="location-button" bindtap="handleLocationButtonTap"');
    expect(formTemplate).toContain('location-privacy-card');
    expect(formTemplate).toContain('id="location-privacy-agree"');
    expect(formTemplate).toContain('open-type="agreePrivacyAuthorization"');
    expect(formTemplate).toContain('bindagreeprivacyauthorization="handleAgreeLocationPrivacyAuthorization"');
    expect(formTemplate).not.toContain('bindtap="handleAgreeLocationPrivacyAuthorization"');
    expect(formTemplate).toContain('同城配送需要用地图位置计算配送费，请一定选择一个地址。');
    expect(formTemplate).toContain('cursor-spacing="120"');
    expect(formStyles).toContain('.location-button::after');
    expect(formStyles).toMatch(/\.location-button \{[\s\S]*?margin-left: auto/);
    expect(formStyles).toContain('padding: 32rpx 24rpx 0');
    expect(formStyles).toContain('.address-form-fixed-action');
    expect(formStyles).toContain('position: fixed');
    expect(formStyles).toContain('padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom))');
    expect(formStyles).toContain('padding-bottom: calc(180rpx + env(safe-area-inset-bottom))');
    expect(appConfig.requiredPrivateInfos).toContain('chooseLocation');
    expect(appConfig.permission['scope.userLocation'].desc).toContain('计算配送费');
    expect(appConfig.pages).not.toContain('pages/location-picker/index');

    instance.onLoad({ type: 'city' });
    instance.handleRecipientInput({ detail: { value: '奶油' } });
    instance.handlePhoneInput({ detail: { value: '13900001111' } });
    instance.handleRegionInput({ detail: { value: '浙江省 杭州市' } });
    instance.handleDetailInput({ detail: { value: '文三路 90 号' } });
    await instance.handleSubmit();
    expect(wx.showToast).toHaveBeenCalledWith({ title: '请选择地图地址，用于计算配送费', icon: 'none' });

    wx.chooseLocation.mockImplementationOnce((options: {
      success: (result: { name: string; address: string; latitude: number; longitude: number }) => void;
    }) => {
      options.success({
        name: '银泰百货',
        address: '浙江省杭州市西湖区文三路',
        latitude: 30.2767,
        longitude: 120.1258
      });
    });
    wx.requirePrivacyAuthorize.mockImplementationOnce((options?: { success?: () => void }) => {
      options?.success?.();
    });

    instance.handleLocationButtonTap();
    expect(wx.chooseLocation).toHaveBeenCalled();
    expect(instance.data.form).toMatchObject({
      regionLabel: '浙江省杭州市西湖区文三路',
      detailAddress: '银泰百货',
      latitude: 30.2767,
      longitude: 120.1258
    });
  });

  it('keeps the address form on native chooseLocation errors instead of opening the in-app map picker', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    const instance = createPageInstance(page);

    instance.onLoad({ type: 'city' });
    wx.requirePrivacyAuthorize.mockImplementationOnce((options?: { success?: () => void }) => {
      options?.success?.();
    });
    wx.chooseLocation.mockImplementationOnce((options: { fail: (error: { errMsg: string; errno: number }) => void }) => {
      options.fail({
        errMsg: 'chooseLocation:fail api scope is not declared in the privacy agreement',
        errno: 112
      });
    });
    instance.handleRegionInput({ detail: { value: '浙江省嘉兴市南湖区香樟国际' } });
    instance.handleDetailInput({ detail: { value: '17 幢 805' } });

    instance.handleLocationButtonTap();

    expect(wx.setStorageSync).not.toHaveBeenCalledWith(
      'xiaipet.locationPickerDraft',
      expect.anything()
    );
    expect(wx.navigateTo).not.toHaveBeenCalledWith({
      url: '/pages/location-picker/index'
    });
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '位置选择失败，请重试',
      icon: 'none'
    });
    expect(wx.showToast).not.toHaveBeenCalledWith({
      title: '请先同意隐私保护指引，再选择位置',
      icon: 'none'
    });
  });

  it('reopens native chooseLocation with existing coordinates when reselecting a mapped address', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    const instance = createPageInstance(page);

    instance.onLoad({ type: 'city' });
    instance.applyLocationSelection({
      name: '17 幢 805',
      address: '浙江省嘉兴市南湖区香樟国际',
      latitude: 30.753924,
      longitude: 120.778561
    });
    wx.requirePrivacyAuthorize.mockImplementationOnce((options?: { success?: () => void }) => {
      options?.success?.();
    });
    wx.chooseLocation.mockImplementationOnce((options: {
      success: (result: { name: string; address: string; latitude: number; longitude: number }) => void;
    }) => {
      options.success({
        name: '顺义区医院',
        address: '北京市顺义区光明南街',
        latitude: 40.1265,
        longitude: 116.6552
      });
    });

    instance.handleLocationButtonTap();

    expect(wx.chooseLocation).toHaveBeenCalled();
    expect(wx.chooseLocation.mock.calls[0]?.[0]).toMatchObject({
      latitude: 30.753924,
      longitude: 120.778561
    });
    expect(wx.setStorageSync).not.toHaveBeenCalledWith(
      'xiaipet.locationPickerDraft',
      expect.anything()
    );
    expect(wx.navigateTo).not.toHaveBeenCalledWith({
      url: '/pages/location-picker/index'
    });
    expect(instance.data.form).toMatchObject({
      regionLabel: '北京市顺义区光明南街',
      detailAddress: '顺义区医院',
      latitude: 40.1265,
      longitude: 116.6552
    });
  });

  it('registers a privacy listener and reveals the location privacy card while chooseLocation is pending', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    const resolvePrivacy = vi.fn();

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'city' });

    expect(wx.onNeedPrivacyAuthorization).toHaveBeenCalled();
    wx.requirePrivacyAuthorize.mockImplementationOnce(() => {
      wx.triggerNeedPrivacyAuthorization(resolvePrivacy, { referrer: 'chooseLocation' });
    });
    instance.handleLocationButtonTap();

    expect(wx.requirePrivacyAuthorize).toHaveBeenCalled();
    expect(wx.chooseLocation).not.toHaveBeenCalled();
    expect(instance.data.locationPrivacyAuthorizationRequired).toBe(true);
    expect(resolvePrivacy).not.toHaveBeenCalled();
  });

  it('opens the location picker after the proactive privacy authorization succeeds', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    const resolvePrivacy = vi.fn();
    let requirePrivacySuccess: (() => void) | undefined;

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'city' });
    wx.requirePrivacyAuthorize.mockImplementationOnce((options?: { success?: () => void }) => {
      requirePrivacySuccess = options?.success;
      wx.triggerNeedPrivacyAuthorization(resolvePrivacy, { referrer: 'chooseLocation' });
    });
    wx.chooseLocation.mockImplementationOnce((options: {
      success: (result: { name: string; address: string; latitude: number; longitude: number }) => void;
    }) => {
      options.success({
        name: '银泰百货',
        address: '浙江省杭州市西湖区文三路',
        latitude: 30.2767,
        longitude: 120.1258
      });
    });

    instance.handleLocationButtonTap();
    instance.handleAgreeLocationPrivacyAuthorization();
    requirePrivacySuccess?.();

    expect(resolvePrivacy).toHaveBeenCalledWith({
      event: 'agree',
      buttonId: 'location-privacy-agree'
    });
    expect(wx.chooseLocation).toHaveBeenCalled();
    expect(instance.data.locationPrivacyAuthorizationRequired).toBe(false);
    expect(instance.data.form).toMatchObject({
      regionLabel: '浙江省杭州市西湖区文三路',
      detailAddress: '银泰百货',
      latitude: 30.2767,
      longitude: 120.1258
    });
  });

  it('does not open the location picker twice when the privacy button emits duplicate events', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    const resolvePrivacy = vi.fn();

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'city' });
    wx.triggerNeedPrivacyAuthorization(resolvePrivacy, { referrer: 'chooseLocation' });
    instance.handleAgreeLocationPrivacyAuthorization();
    instance.handleAgreeLocationPrivacyAuthorization();

    expect(resolvePrivacy).toHaveBeenCalledTimes(1);
  });

  it('falls back to starting location picking when the agreement event fires without a pending privacy resolver', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    wx.chooseLocation.mockImplementationOnce(() => {});

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'city' });
    instance.setData({ locationPrivacyAuthorizationRequired: true });
    instance.handleAgreeLocationPrivacyAuthorization();

    expect(wx.requirePrivacyAuthorize).not.toHaveBeenCalled();
    expect(wx.chooseLocation).toHaveBeenCalled();
    expect(instance.data.locationPrivacyAuthorizationRequired).toBe(false);
  });

  it('lets the privacy card recover from a direct chooseLocation privacy failure by retrying the picker', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    wx.requirePrivacyAuthorize.mockImplementationOnce((options?: { fail?: () => void }) => {
      options?.fail?.();
    });

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'city' });
    instance.handleLocationButtonTap();

    expect(instance.data.locationPrivacyAuthorizationRequired).toBe(true);
    expect(wx.chooseLocation).not.toHaveBeenCalled();
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '请先同意隐私保护指引，再选择位置',
      icon: 'none'
    });
  });

  it('lets city address creation optionally copy an independent express address', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    const { resetAddresses } = await import('../src/services/address');

    resetAddresses();

    const createdAddresses: Array<Record<string, unknown>> = [];
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

      if (path === '/api/v1/customer/addresses' && options.method === 'POST') {
        const index = createdAddresses.length + 1;
        const address = {
          id: `addr-${options.data.type}-${index}`,
          ...(options.data as Record<string, unknown>),
          isDefault: false
        };
        createdAddresses.push(address);
        respondApi(options, { ok: true, address });
        return;
      }

      if (path === '/api/v1/customer/addresses/addr-express-2/default') {
        respondApi(options, {
          ok: true,
          address: {
            ...createdAddresses[1],
            isDefault: true
          }
        });
        return;
      }

      respondApi(options, { ok: false, code: 'NOT_FOUND' }, 404);
    });

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'city' });

    expect(instance.data).toMatchObject({
      showSyncExpressAddress: true,
      syncExpressAddress: false
    });

    instance.handleSyncExpressTap();
    instance.handleRecipientInput({ detail: { value: '奶油' } });
    instance.handlePhoneInput({ detail: { value: '13900001111' } });
    instance.handleRegionInput({ detail: { value: '浙江省 杭州市' } });
    instance.handleDetailInput({ detail: { value: '文三路 90 号' } });
    instance.handleTagInput({ detail: { value: '家' } });
    instance.setData({
      form: {
        ...instance.data.form,
        latitude: 30.2767,
        longitude: 120.1258
      }
    });

    await instance.handleSubmit();

    const addressRequests = wx.request.mock.calls
      .map(([options]) => options)
      .filter((options) => getRequestPath(options) === '/api/v1/customer/addresses' || getRequestPath(options).endsWith('/default'));

    expect(addressRequests.map((options) => [getRequestPath(options), options.method])).toEqual([
      ['/api/v1/customer/addresses', 'POST'],
      ['/api/v1/customer/addresses', 'POST'],
      ['/api/v1/customer/addresses/addr-express-2/default', 'PUT']
    ]);
    expect(addressRequests[0]?.data).toMatchObject({
      type: 'city',
      latitude: 30.2767,
      longitude: 120.1258
    });
    expect(addressRequests[1]?.data).toEqual({
      ...addressRequests[0]?.data,
      type: 'express'
    });
    expect(wx.showToast).toHaveBeenCalledWith({ title: '地址已新增，已同步快递地址', icon: 'none' });
    expect(wx.navigateBack).toHaveBeenCalled();
  });

  it('keeps the saved city address when express address copying fails', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/address-form/index.ts');
    const { getAddresses, resetAddresses } = await import('../src/services/address');

    resetAddresses();

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

      if (path === '/api/v1/customer/addresses' && options.method === 'POST' && options.data.type === 'city') {
        respondApi(options, {
          ok: true,
          address: {
            id: 'addr-city-1',
            ...(options.data as Record<string, unknown>)
          }
        });
        return;
      }

      if (path === '/api/v1/customer/addresses' && options.method === 'POST' && options.data.type === 'express') {
        respondApi(options, {
          ok: false,
          code: 'EXPRESS_CREATE_FAILED',
          message: 'Express create failed'
        });
        return;
      }

      respondApi(options, { ok: false, code: 'NOT_FOUND' }, 404);
    });

    const instance = createPageInstance(page);
    instance.onLoad({ type: 'city' });
    instance.handleSyncExpressTap();
    instance.handleRecipientInput({ detail: { value: '奶油' } });
    instance.handlePhoneInput({ detail: { value: '13900001111' } });
    instance.handleRegionInput({ detail: { value: '浙江省 杭州市' } });
    instance.handleDetailInput({ detail: { value: '文三路 90 号' } });
    instance.setData({
      form: {
        ...instance.data.form,
        latitude: 30.2767,
        longitude: 120.1258
      }
    });

    await instance.handleSubmit();

    expect(getAddresses('city')).toEqual([
      expect.objectContaining({
        id: 'addr-city-1',
        type: 'city'
      })
    ]);
    expect(getAddresses('express')).toEqual([]);
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '同城地址已保存，快递地址同步失败，可稍后手动新增',
      icon: 'none'
    });
    expect(wx.navigateBack).toHaveBeenCalled();
  });

  it('exposes delivery, pickup, and express fulfillment modes on the checkout page', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { updateProfile } = await import('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/src/services/profile');
    const instance = createPageInstance(page);

    updateProfile({ contactPhoneMasked: '138****1234' });
    instance.onShow();

    expect(instance.data.fulfillmentModes.map((item: { value: string }) => item.value)).toEqual([
      'delivery',
      'pickup',
      'express'
    ]);
    expect(instance.data.activeFulfillmentMode).toBe('delivery');
    expect(instance.data.pickupPhone).toBe('138****1234');
  });

  it('limits checkout fulfillment modes to the selected cart item intersection', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { setFulfillmentMode } = await import('../src/services/checkout');

    clearCart();

    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing checkout fulfillment fixture');
    }

    setFulfillmentMode('pickup');
    addCartItem({ ...product, id: 'delivery-only', deliveryModes: ['delivery'] }, '', 1);

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.fulfillmentModes.map((item: { value: string }) => item.value)).toEqual(['delivery']);
    expect(instance.data.activeFulfillmentMode).toBe('delivery');
  });

  it('selects a reservation slot from a compact modal and opens delivery fee details in a modal', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T09:00:00+08:00'));

    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { readFile } = await import('node:fs/promises');
    const instance = createPageInstance(page);

    instance.onShow();

    const firstDay = instance.data.reservationOptions[0];
    const firstSlot = firstDay?.slots[0];

    if (!firstDay || !firstSlot) {
      throw new Error('missing reservation option fixture');
    }

    const checkoutTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.wxml',
      'utf8'
    );
    const checkoutStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.wxss',
      'utf8'
    );

    expect(instance.data.reservationOptions).toHaveLength(17);
    expect(instance.data.reservationOptions.slice(0, 4).map((item: { label: string }) => item.label)).toEqual([
      '今天 5月8日',
      '明天 5月9日',
      '后天 5月10日',
      '5月11日'
    ]);
    expect(checkoutTemplate).toContain('wx:for-item="day"');
    expect(checkoutTemplate).toContain('wx:for-item="slot"');
    expect(checkoutTemplate).toContain('{{slot.label}}');
    expect(checkoutTemplate).toContain('class="reservation-mask"');
    expect(checkoutTemplate).toContain('bindtap="handleOpenReservationModal"');
    expect(checkoutTemplate).toContain('bindtap="handleConfirmReservation"');
    expect(checkoutTemplate).toContain('notice-check-mark');
    expect(checkoutTemplate).toContain('下单前请先查看购前须知');
    expect(checkoutTemplate).not.toContain('先把履约方式、预约时间、宠物、备注和下单前提示统一确认好');
    expect(checkoutTemplate).not.toContain('优先复用已绑定联系方式');
    expect(checkoutTemplate).toContain('activeFulfillmentMode !== \'express\'');
    expect(checkoutTemplate).toContain('type="text" value="{{pickupPhone}}"');
    expect(checkoutStyles).toContain('.pet-choice.active');
    expect(checkoutStyles).toContain('border-color: #B9DDE8');
    expect(checkoutStyles).toContain('padding: 22rpx 20rpx calc(30rpx + env(safe-area-inset-bottom))');
    expect(checkoutStyles).toContain('.reservation-confirm');
    expect(checkoutStyles).toContain('align-items: center');
    expect(checkoutTemplate).toContain('class="delivery-fee-mask"');
    expect(checkoutTemplate).not.toContain('delivery-rule-list');

    expect(instance.data.showReservationModal).toBe(false);
    instance.handleOpenReservationModal();
    expect(instance.data.showReservationModal).toBe(true);
    expect(instance.data.pendingReservationDateValue).toBe(firstDay.value);
    expect(instance.data.pendingReservationTimeValue).toBe(firstSlot.value);

    const secondDay = instance.data.reservationOptions[1];
    const secondSlot = secondDay?.slots[1];

    if (!secondDay || !secondSlot) {
      throw new Error('missing second reservation option fixture');
    }

    instance.handleReservationDateTap({
      currentTarget: {
        dataset: {
          dateValue: secondDay.value
        }
      }
    });
    instance.handleReservationSlotTap({
      currentTarget: {
        dataset: {
          timeValue: secondSlot.value
        }
      }
    });

    expect(instance.data.selectedReservationValue).toBe('');
    expect(instance.data.pendingReservationDateValue).toBe(secondDay.value);
    expect(instance.data.pendingReservationTimeValue).toBe(secondSlot.value);

    instance.handleConfirmReservation();

    expect(instance.data.showReservationModal).toBe(false);
    expect(instance.data.selectedReservationValue).toBe(`${secondDay.value}-${secondSlot.value}`);
    expect(instance.data.selectedReservationLabel).toBe(`${secondDay.label} ${secondSlot.label}`);

    expect(instance.data.showDeliveryFeeModal).toBe(false);
    instance.handleDeliveryFeeTap();
    expect(instance.data.showDeliveryFeeModal).toBe(true);
    instance.handleCloseDeliveryFeeModal();
    expect(instance.data.showDeliveryFeeModal).toBe(false);

    vi.useRealTimers();
  });

  it('navigates from checkout into the dedicated remark editor', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { readFile } = await import('node:fs/promises');
    const instance = createPageInstance(page);

    instance.handleRemarkTap();

    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/checkout-remark/index'
    });

    const remarkStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout-remark/index.wxss',
      'utf8'
    );

    expect(remarkStyles).toContain('padding-bottom: calc(190rpx + env(safe-area-inset-bottom))');
    expect(remarkStyles).toContain('padding: 22rpx 20rpx calc(30rpx + env(safe-area-inset-bottom))');
    expect(remarkStyles).toContain('align-items: center');
  });

  it('refreshes checkout summary immediately after confirming an order remark', async () => {
    const { page: remarkPage, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout-remark/index.ts');
    const { getCheckoutDraft } = await import('../src/services/checkout');
    const previousPage = {
      refreshCheckout: vi.fn()
    };
    vi.stubGlobal('getCurrentPages', () => [
      previousPage,
      {}
    ]);
    const remarkInstance = createPageInstance(remarkPage);

    remarkInstance.onShow();
    remarkInstance.handleInput({
      detail: {
        value: '少糖，送达前电话联系'
      }
    });

    expect(getCheckoutDraft().remark).toBe('少糖，送达前电话联系');
    expect(previousPage.refreshCheckout).toHaveBeenCalled();

    remarkInstance.handleConfirm();

    expect(previousPage.refreshCheckout).toHaveBeenCalled();
    expect(wx.navigateBack).toHaveBeenCalled();
  });

  it('marks pet cards as selected so the checkout template can update the card color', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { resetCheckoutDraft } = await import('../src/services/checkout');
    const { createPet, resetPets } = await import('../src/services/pets');
    const { readFile } = await import('node:fs/promises');

    resetCheckoutDraft();
    resetPets();

    const pet = createPet({
      name: '布丁',
      gender: 'female',
      birthday: '2023-04-12',
      allergyNotes: ''
    });

    if (!pet) {
      throw new Error('missing pet fixture');
    }

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.pets.find((item: { id: string }) => item.id === pet.id)).toMatchObject({
      selected: false
    });

    instance.handlePetTap({
      currentTarget: {
        dataset: {
          petId: pet.id
        }
      }
    });

    expect(instance.data.selectedPetIds).toEqual([pet.id]);
    expect(instance.data.pets.find((item: { id: string }) => item.id === pet.id)).toMatchObject({
      selected: true
    });

    const checkoutTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.wxml',
      'utf8'
    );

    expect(checkoutTemplate).toContain("{{item.selected ? 'active' : ''}}");
  });

  it('renders the pet records page without hero copy and keeps the add action fixed above safe area', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/pets/index.ts');
    const { resetPets } = await import('../src/services/pets');
    const { readFile } = await import('node:fs/promises');

    resetPets();

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.pets).toEqual([]);

    const petsTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/pets/index.wxml',
      'utf8'
    );
    const petsStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/pets/index.wxss',
      'utf8'
    );

    expect(petsTemplate).not.toContain('class="pets-hero"');
    expect(petsTemplate).not.toContain('class="pets-title"');
    expect(petsTemplate).not.toContain('先把多宠物资料独立管理好');
    expect(petsTemplate).toContain('class="pet-fixed-action"');
    expect(petsTemplate).toContain('class="pet-add-button"');
    expect(petsStyles).toContain('.pet-fixed-action');
    expect(petsStyles).toContain('position: fixed');
    expect(petsStyles).toContain('padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom))');
    expect(petsStyles).toContain('padding-bottom: calc(180rpx + env(safe-area-inset-bottom))');
    expect(petsStyles).not.toContain('.pets-hero');
    expect(petsStyles).not.toContain('.pets-title');
  });

  it('renders the pet form with address-style top context and fixed safe-area save action', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/pet-form/index.ts');
    const { readFile } = await import('node:fs/promises');

    const instance = createPageInstance(page);
    instance.onLoad();

    expect(instance.data.mode).toBe('create');

    const formTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/pet-form/index.wxml',
      'utf8'
    );
    const formStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/pet-form/index.wxss',
      'utf8'
    );

    expect(formTemplate).not.toContain('class="pet-form-hero"');
    expect(formTemplate).not.toContain('class="pet-form-subtitle"');
    expect(formTemplate).toContain('class="pet-form-context"');
    expect(formTemplate).toContain('class="pet-form-fixed-action"');
    expect(formTemplate).toContain('cursor-spacing="120"');
    expect(formStyles).toContain('padding: 32rpx 24rpx 0');
    expect(formStyles).toContain('.pet-form-fixed-action');
    expect(formStyles).toContain('position: fixed');
    expect(formStyles).toContain('padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom))');
    expect(formStyles).toContain('padding-bottom: calc(180rpx + env(safe-area-inset-bottom))');
  });

  it('keeps birthday editable until the profile detail form is saved', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile-detail/index.ts');
    const { getProfile, resetProfile } = await import('../src/services/profile');

    resetProfile();

    const instance = createPageInstance(page);
    instance.onShow();

    instance.handleBirthdayChange({
      detail: {
        value: '2024-05-08'
      }
    });

    expect(instance.data.profile).toMatchObject({
      birthday: '2024-05-08',
      birthdayLocked: false
    });
    expect(getProfile()).toMatchObject({
      birthday: '',
      birthdayLocked: false
    });

    instance.handleBirthdayChange({
      detail: {
        value: '2024-05-09'
      }
    });

    expect(instance.data.profile).toMatchObject({
      birthday: '2024-05-09',
      birthdayLocked: false
    });

    instance.handleSave();

    expect(getProfile()).toMatchObject({
      birthday: '2024-05-09',
      birthdayLocked: true
    });
    expect(instance.data.profile).toMatchObject({
      birthday: '2024-05-09',
      birthdayLocked: true
    });
  });

  it('hydrates saved profile data when opening the profile detail page', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile-detail/index.ts');
    const { resetProfile } = await import('../src/services/profile');

    resetProfile();
    const defaultRequest = createDefaultRequestMock();
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/profile') {
        respondApi(options, {
          ok: true,
          profile: {
            nickname: 'Cookie大爹',
            gender: 'male',
            birthday: '2024-05-09',
            birthdayLocked: true,
            contactPhoneMasked: '188****6099',
            contactPhone: '18811736099'
          }
        });
        return;
      }

      defaultRequest(options);
    });

    const instance = createPageInstance(page);
    await instance.onShow();

    expect(instance.data.profile).toMatchObject({
      nickname: 'Cookie大爹',
      gender: 'male',
      birthday: '2024-05-09',
      birthdayLocked: true,
      contactPhoneMasked: '188****6099',
      contactPhone: '18811736099'
    });
  });

  it('passes profile detail redirect through to phone binding', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile-detail/index.ts');
    const instance = createPageInstance(page);

    instance.onLoad({
      redirect: '%2Fpages%2Fcart%2Findex'
    });
    instance.handleContactTap();

    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/contact-bind/index?redirect=%2Fpages%2Fcart%2Findex'
    });
  });

  it('renders the profile hub as a balance-first account dashboard without the intro copy', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile/index.ts');
    const { updateProfile } = await import('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/src/services/profile');
    const { readFile } = await import('node:fs/promises');
    const instance = createPageInstance(page);

    instance.onShow();

    expect(instance.data.summary).toMatchObject({
      balance: 0,
      totalSpent: 0,
      nickname: '喜爱宠家长'
    });

    const profileTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile/index.wxml',
      'utf8'
    );
    const profileStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile/index.wxss',
      'utf8'
    );

    expect(profileTemplate).not.toContain('下单前需要的个人资料、宠物、地址和余额上下文');
    expect(profileTemplate).toContain('class="balance-card"');
    expect(profileTemplate).toContain('style="{{membershipCardStyle}}"');
    expect(profileTemplate).toContain('class="balance-amount"');
    expect(profileTemplate).toContain('bindtap="handleBalanceTap"');
    expect(profileTemplate).toContain('class="quick-grid"');
    expect(profileTemplate).toContain('class="member-chip in-card"');
    expect(profileTemplate).toContain('class="fact-pill {{summary.birthdayLabel ===');
    expect(profileTemplate).toContain('data-target="birthday"');
    expect(profileTemplate).toContain('data-target="contact"');
    expect(profileStyles).toContain('.balance-card');
    expect(profileStyles).toContain('background: var(--member-card-bg)');
    expect(profileStyles).toContain('font-size: 76rpx');
    expect(profileStyles).toContain('display: grid');
    expect(profileStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(profileStyles).toContain('.member-chip.in-card');
    expect(profileTemplate).toContain('style="--profile-safe-top: {{profileSafeTop}}rpx;"');
    expect(profileStyles).toContain('padding: var(--profile-safe-top, 144rpx) 24rpx calc(242rpx + env(safe-area-inset-bottom))');

    instance.handleBalanceTap();

    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/contact-bind/index?redirect=%2Fpages%2Fbalance%2Findex'
    });

    updateProfile({ contactPhoneMasked: '138****1234' });
    instance.handleBalanceTap();

    expect(wx.navigateTo).toHaveBeenLastCalledWith({
      url: '/pages/balance/index'
    });

    instance.handleProfileFactTap({
      currentTarget: {
        dataset: {
          target: 'birthday'
        }
      }
    });

    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/profile-detail/index'
    });
  });

  it('renders the balance ledger page without the old hero title copy', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/balance/index.ts');
    const { updateProfile } = await import('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/src/services/profile');
    const { readFile } = await import('node:fs/promises');
    const instance = createPageInstance(page);

    updateProfile({ contactPhoneMasked: '138****1234' });
    instance.onShow();

    expect(instance.data.overview).toMatchObject({
      currentBalance: 0,
      totalIncome: 0,
      totalExpense: 0
    });
    expect(instance.data.groups).toEqual([]);

    const balanceTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/balance/index.wxml',
      'utf8'
    );
    const balanceStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/balance/index.wxss',
      'utf8'
    );

    expect(balanceTemplate).not.toContain('class="balance-hero"');
    expect(balanceTemplate).not.toContain('class="balance-title"');
    expect(balanceTemplate).not.toContain('按月份看充值、抵扣和补偿返还');
    expect(balanceTemplate).toContain('class="balance-overview-card"');
    expect(balanceTemplate).toContain('class="overview-balance-line"');
    expect(balanceTemplate).toContain('class="overview-head-action"');
    expect(balanceTemplate).not.toContain('可用于订单抵扣');
    expect(balanceTemplate).not.toContain('class="overview-status"');
    expect(balanceTemplate).not.toContain('class="overview-action-row"');
    expect(balanceTemplate).toContain('class="ledger-amount-wrap {{item.type ===');
    expect(balanceStyles).toContain('.balance-overview-card');
    expect(balanceStyles).toContain('.overview-head-action');
    expect(balanceStyles).not.toContain('.overview-status');
    expect(balanceStyles).toContain('linear-gradient(145deg, #FFF8D8 0%, #F6E396 62%, #F2C46F 100%)');
    expect(balanceStyles).toContain('.ledger-amount-wrap.income .ledger-amount');
    expect(balanceStyles).not.toContain('.overview-action-row');
    expect(balanceStyles).not.toContain('.balance-hero');
    expect(balanceStyles).not.toContain('.balance-title');
  });

  it('redirects unbound users from the balance page to phone binding before recharge context', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/balance/index.ts');
    const instance = createPageInstance(page);

    await instance.refreshBalance();

    expect(wx.redirectTo).toHaveBeenCalledWith({
      url: '/pages/contact-bind/index?redirect=%2Fpages%2Fbalance%2Findex'
    });
  });

  it('derives profile top spacing from the WeChat capsule metrics instead of a fixed rpx value', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile/index.ts');
    wx.getWindowInfo = vi.fn(() => ({ statusBarHeight: 20, windowWidth: 375 }));
    (wx as any).getMenuButtonBoundingClientRect = vi.fn(() => ({ bottom: 88 }));

    const instance = createPageInstance(page);
    instance.onShow();

    expect(instance.data.profileSafeTop).toBe(208);
  });

  it('renders contact binding as a manual phone entry only flow', async () => {
    const { readFile } = await import('node:fs/promises');
    const contactTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/contact-bind/index.wxml',
      'utf8'
    );
    const contactStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/contact-bind/index.wxss',
      'utf8'
    );
    const detailStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile-detail/index.wxss',
      'utf8'
    );

    expect(contactTemplate).toContain('绑定手机号');
    expect(contactTemplate).toContain('bindtap="handleManualSubmit"');
    expect(contactTemplate).toContain('inputmode="tel"');
    expect(contactTemplate).toContain('maxlength="11"');
    expect(contactTemplate).not.toContain('微信手机号授权');
    expect(contactTemplate).not.toContain('使用微信手机号');
    expect(contactTemplate).not.toContain('open-type="getPhoneNumber"');
    expect(contactTemplate).not.toContain('open-type="agreePrivacyAuthorization"');
    expect(contactTemplate).not.toContain('privacyAuthorizationRequired');
    expect(contactTemplate).toContain('status-card {{statusTone}}');
    expect(contactStyles).toContain('background: linear-gradient(180deg, #FFFDF5 0%, #FFF9DF 64%, #F6E396 100%)');
    expect(contactStyles).toContain('.status-card.error');
    expect(detailStyles).toContain('background: radial-gradient(circle at 12% 0%, rgba(246, 227, 150, 0.4) 0, transparent 34%)');
  });

  it('prefills the contact binding form from the existing full profile phone', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/contact-bind/index.ts');
    const { resetProfile, updateProfile } = await import('../src/services/profile');
    resetProfile();
    updateProfile({
      contactPhone: '18811736099',
      contactPhoneMasked: '188****6099'
    });
    const instance = createPageInstance(page);

    instance.onLoad({
      redirect: encodeURIComponent('/pages/profile-detail/index')
    });

    expect(instance.data.manualPhone).toBe('18811736099');
    expect(instance.data.redirectUrl).toBe('/pages/profile-detail/index');
  });

  it('centers the profile birthday lock badge text inside the pill', async () => {
    const { readFile } = await import('node:fs/promises');
    const detailTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile-detail/index.wxml',
      'utf8'
    );
    const detailStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile-detail/index.wxss',
      'utf8'
    );
    const lockBadgeRule = detailStyles.match(/\.lock-badge\s*\{[^}]+\}/)?.[0] ?? '';
    const lockBadgeTextRule = detailStyles.match(/\.lock-badge-text\s*\{[^}]+\}/)?.[0] ?? '';

    expect(detailTemplate).toContain('<view class="lock-badge {{profile.birthdayLocked ? \'locked\' : \'\'}}">');
    expect(detailTemplate).toContain('<text class="lock-badge-text">');
    expect(detailTemplate).not.toContain('<text class="lock-badge {{profile.birthdayLocked ? \'locked\' : \'\'}}">');
    expect(lockBadgeRule).toContain('display: flex');
    expect(lockBadgeRule).toContain('align-items: center');
    expect(lockBadgeRule).toContain('justify-content: center');
    expect(lockBadgeRule).toContain('height: 52rpx');
    expect(lockBadgeTextRule).toContain('line-height: 1');
    expect(lockBadgeTextRule).toContain('transform: translateY(2rpx)');
  });

  it('returns to the requested balance page after phone binding succeeds', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/contact-bind/index.ts');
    const instance = createPageInstance(page);

    instance.onLoad({
      redirect: encodeURIComponent('/pages/balance/index')
    });
    instance.setData({
      manualPhone: '13800138123'
    });
    await instance.handleManualSubmit();

    expect(wx.redirectTo).toHaveBeenCalledWith({
      url: '/pages/balance/index'
    });
  });

  it('shows wechat and balance payment methods on the checkout page', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const instance = createPageInstance(page);

    instance.onShow();

    expect(instance.data.paymentMethods.map((item: { value: string }) => item.value)).toEqual([
      'balance',
      'wechat'
    ]);
    expect(instance.data.activePaymentMethod).toBe('balance');
  });

  it('redirects to order detail after a successful checkout submit and clears purchased cart items', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart, getCartItems } = await import('../src/services/cart');
    const { createAddress, resetAddresses, selectAddress } = await import('../src/services/address');
    const { resetCheckoutDraft, setCustomNoticeAcknowledged, setReservationSelection } = await import('../src/services/checkout');
    const { updateProfile } = await import('../src/services/profile');

    clearCart();
    resetAddresses();
    resetCheckoutDraft();

    const product = getProductById('ocean-party');
    updateProfile({ contactPhoneMasked: '138****1234' });
    const address = createAddress({
      type: 'city',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '上海市 黄浦区',
      detailAddress: '外滩 18 号 201',
      tag: '公司'
    });

    if (!product || !address) {
      throw new Error('missing checkout submit fixtures');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 1);
    selectAddress(address.id);
    setCustomNoticeAcknowledged(true);
    setReservationSelection({
      dateValue: '2026-04-17',
      dateLabel: '今天 04-17',
      timeValue: '11:00',
      timeLabel: '11:00'
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

    expect(wx.redirectTo).toHaveBeenCalledWith(expect.objectContaining({
      url: '/pages/order-detail/index?orderId=order-001'
    }));
    expect(getCartItems()).toHaveLength(0);
    expect(instance.data.submitting).toBe(true);
  });

  it('unlocks checkout and keeps selected cart items when balance payment fails', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart, getCartItems } = await import('../src/services/cart');
    const { createAddress, resetAddresses, selectAddress } = await import('../src/services/address');
    const { resetCheckoutDraft, setCustomNoticeAcknowledged, setReservationSelection } = await import('../src/services/checkout');
    const { updateProfile } = await import('../src/services/profile');

    clearCart();
    resetAddresses();
    resetCheckoutDraft();

    const product = getProductById('ocean-party');
    updateProfile({ contactPhoneMasked: '138****1234' });
    const address = createAddress({
      type: 'city',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '上海市 黄浦区',
      detailAddress: '外滩 18 号 201',
      tag: '公司'
    });

    if (!product || !address) {
      throw new Error('missing checkout failure fixtures');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 1);
    selectAddress(address.id);
    setCustomNoticeAcknowledged(true);
    setReservationSelection({
      dateValue: '2026-04-17',
      dateLabel: '今天 04-17',
      timeValue: '11:00',
      timeLabel: '11:00'
    });

    const defaultRequest = createDefaultRequestMock();
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/orders/order-001/payment') {
        respondApi(options, {
          ok: false,
          code: 'INSUFFICIENT_BALANCE',
          paymentStatus: 'blocked'
        });
        return;
      }

      defaultRequest(options);
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

    expect(instance.data.submitting).toBe(false);
    expect(getCartItems()).toHaveLength(1);
    expect(wx.switchTab).not.toHaveBeenCalled();
    expect(wx.showToast).toHaveBeenCalledWith(expect.objectContaining({
      title: '余额不足'
    }));
  });

  it('ignores repeated submit taps while the checkout request is still in flight', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { createAddress, resetAddresses, selectAddress } = await import('../src/services/address');
    const { resetCheckoutDraft, setCustomNoticeAcknowledged, setReservationSelection } = await import('../src/services/checkout');
    const { updateProfile } = await import('../src/services/profile');

    clearCart();
    resetAddresses();
    resetCheckoutDraft();

    const product = getProductById('ocean-party');
    updateProfile({ contactPhoneMasked: '138****1234' });
    const address = createAddress({
      type: 'city',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '上海市 黄浦区',
      detailAddress: '外滩 18 号 201',
      tag: '公司'
    });

    if (!product || !address) {
      throw new Error('missing checkout submit fixtures');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 1);
    selectAddress(address.id);
    setCustomNoticeAcknowledged(true);
    setReservationSelection({
      dateValue: '2026-04-17',
      dateLabel: '今天 04-17',
      timeValue: '11:00',
      timeLabel: '11:00'
    });

    let resolvePayment: (() => void) | null = null;
    const defaultRequest = createDefaultRequestMock();
    wx.request.mockImplementation((options) => {
      const path = getRequestPath(options);

      if (path === '/api/v1/customer/orders/order-001/payment') {
        resolvePayment = () => {
          respondApi(options, {
            ok: true,
            paymentStatus: 'paid',
            order: createCheckoutApiOrder()
          });
        };
        return;
      }

      defaultRequest(options);
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

    const firstSubmit = instance.handleSubmit();
    const secondSubmit = instance.handleSubmit();

    await Promise.resolve();
    await Promise.resolve();

    const getPaymentRequestCalls = () =>
      wx.request.mock.calls.filter(([options]) => getRequestPath(options) === '/api/v1/customer/orders/order-001/payment');

    await vi.waitFor(() => {
      expect(getPaymentRequestCalls()).toHaveLength(1);
    });
    if (!resolvePayment) {
      throw new Error('payment request was not captured');
    }
    const completePayment = resolvePayment as () => void;
    completePayment();

    await Promise.all([firstSubmit, secondSubmit]);
    expect(getPaymentRequestCalls()).toHaveLength(1);
  });
});
