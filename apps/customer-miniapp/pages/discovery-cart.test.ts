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
    getWindowInfo: () => ({ statusBarHeight: 20 }),
    getSystemInfoSync: () => ({ statusBarHeight: 20 }),
    getMenuButtonBoundingClientRect: () => null,
    createSelectorQuery: () => {
      const query = {
        select: vi.fn(() => query),
        selectAll: vi.fn(() => query),
        boundingClientRect: vi.fn(() => query),
        exec: vi.fn((callback?: (result: unknown[]) => void) => {
          callback?.([{ top: 0 }, []]);
        })
      };
      return query;
    },
    showToast: vi.fn(),
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
    showShareMenu: vi.fn()
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

describe('discovery cart pages', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('keeps the catalog page aligned with the refreshed warm commerce layout', async () => {
    const { readFile } = await import('node:fs/promises');
    const catalogTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.wxml',
      'utf8'
    );
    const catalogStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.wxss',
      'utf8'
    );

    expect(catalogTemplate).toContain('class="search-icon"');
    expect(catalogTemplate).toContain('class="cart-float-icon"');
    expect(catalogStyles).toContain('linear-gradient(180deg, #FFFDF5 0%, #FFF9DF 58%, #F6E396 100%)');
    expect(catalogStyles).toContain('background: #F6E396');
    expect(catalogStyles).toContain('border: 4rpx solid #40535C');
    expect(catalogStyles).toContain('background: #40535C');
    expect(catalogStyles).toContain('bottom: calc(42rpx + env(safe-area-inset-bottom))');
    expect(catalogStyles).toContain('align-items: center');
    expect(catalogStyles).toContain('padding: calc(96rpx + env(safe-area-inset-top)) 24rpx calc(96rpx + env(safe-area-inset-bottom))');
    expect(catalogStyles).toContain('.quick-buy-submit::after');
  });

  it('hydrates the catalog page with merchant-configured customer categories on load', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories') {
        return {
          ok: true,
          categories: [
            {
              id: 'merchant-seasonal',
              name: '节日限定',
              iconToken: '节',
              sortOrder: 0,
              createdAt: '2026-05-16T00:00:00.000Z',
              updatedAt: '2026-05-16T00:00:00.000Z'
            }
          ]
        };
      }

      if (path === '/api/v1/customer/catalog/products') {
        return {
          ok: true,
          products: [
            {
              id: 'merchant-seasonal-cake',
              name: '南瓜小蛋糕',
              description: '商户配置商品',
              detailContent: '适合节日加餐',
              categoryId: 'merchant-seasonal',
              imageFileId: '/assets/catalog/product-card-reference.png',
              imagePreviewUrl: '/assets/catalog/product-card-reference.png',
              memberLevelId: null,
              status: 'published',
              stock: 8,
              trackInventory: true,
              fulfillmentModes: ['delivery'],
              basePrice: 98,
              specs: [],
              formulas: [],
              priceOverrides: [],
              purchaseLimit: { enabled: false, maxQuantity: null },
              gallery: [],
              detailImages: [],
              createdAt: '2026-05-16T00:00:00.000Z',
              updatedAt: '2026-05-16T00:00:00.000Z'
            }
          ]
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    vi.doMock('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/src/services/api-client.ts', () => ({
      customerApiRequest: apiRequest
    }));

    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.ts');
    const instance = createPageInstance(page);

    await instance.onLoad();

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/catalog/categories', {
      method: 'GET',
      auth: 'none'
    });
    expect(instance.data.categories).toEqual([
      expect.objectContaining({
        id: 'merchant-seasonal',
        name: '节日限定',
        shortName: '节日限定',
        iconText: '节'
      })
    ]);
    expect(instance.data.sections[0]?.category.id).toBe('merchant-seasonal');
    expect(instance.data.sections[0]?.availableProducts[0]?.name).toBe('南瓜小蛋糕');
  });

  it('rebuilds hydrated catalog sections when returning from product detail', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories') {
        return {
          ok: true,
          categories: [
            {
              id: 'merchant-seasonal',
              name: '节日限定',
              iconToken: '节'
            }
          ]
        };
      }

      if (path === '/api/v1/customer/catalog/products') {
        return {
          ok: true,
          products: [
            {
              id: 'merchant-seasonal-cake',
              name: '南瓜小蛋糕',
              description: '商户配置商品',
              categoryId: 'merchant-seasonal',
              imageFileId: '/assets/catalog/product-card-reference.png',
              stock: 8,
              trackInventory: true,
              fulfillmentModes: ['delivery'],
              basePrice: 98,
              specs: []
            }
          ]
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    vi.doMock('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/src/services/api-client.ts', () => ({
      customerApiRequest: apiRequest
    }));

    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.ts');
    const instance = createPageInstance(page);

    await instance.onLoad();
    instance.setData({ sections: [] });
    instance.onShow();

    expect(instance.data.sections[0]?.availableProducts[0]?.id).toBe('merchant-seasonal-cake');
  });

  it('keeps the product detail page aligned with the refreshed warm commerce layout', async () => {
    const { readFile } = await import('node:fs/promises');
    const detailTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.wxml',
      'utf8'
    );
    const detailStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.wxss',
      'utf8'
    );

    expect(detailTemplate).toContain('class="detail-card spec-card"');
    expect(detailTemplate).toContain('尺寸和口味选择');
    expect(detailStyles).toContain('linear-gradient(180deg, #FFFDF5 0%, #FFF9DF 58%, #F6E396 100%)');
    expect(detailStyles).toContain('margin-top: -74rpx');
    expect(detailStyles).toContain('.stepper-btn::before');
    expect(detailStyles).toContain('.stepper-btn.plus::after');
    expect(detailStyles).toMatch(/\.add-cart-button\.disabled \{[\s\S]*?background: #F6E396/);
    expect(detailStyles).toContain('padding: 22rpx 24rpx calc(24rpx + env(safe-area-inset-bottom))');
    expect(detailStyles).toContain('.add-cart-button::after');
  });

  it('opens quick buy in search when a spec product is added', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/search/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { clearCart } = await import('../src/services/cart');
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

    expect(instance.data.showQuickBuy).toBe(true);
    expect(instance.data.selectedProduct?.id).toBe(product.id);
    expect(instance.data.selectedSpecId).toBe(product.specs[0]?.id ?? '');
    expect(wx.showToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: '请进入详情页选规格' })
    );
  });

  it('confirms quick buy from search into the selected spec row', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/search/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { clearCart, getCartProductQuantity } = await import('../src/services/cart');
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
          specId: product.specs[1]?.id
        }
      }
    });
    instance.handleConfirmQuickBuy();

    expect(getCartProductQuantity(product.id, product.specs[1]?.id ?? '')).toBe(1);
    expect(instance.data.cartCount).toBe(1);
    expect(instance.data.results[0]?.cartQuantity).toBe(1);
    expect(instance.data.showQuickBuy).toBe(false);
  });

  it('shows spec button quantity as the total across all specs in discovery pages', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/search/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    clearCart();
    addCartItem(product, product.specs[0]!.id, 1);
    addCartItem(product, product.specs[1]!.id, 2);

    const instance = createPageInstance(page);
    instance.data.results = [product];
    instance.onShow();

    const searchProduct = instance.data.results.find((item: { id: string }) => item.id === product.id);

    expect(searchProduct?.cartQuantity).toBe(3);
  });

  it('keeps detail stepper as local pending quantity until add-to-cart is confirmed', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { clearCart, getCartCount, getCartProductQuantity } = await import('../src/services/cart');
    const product = getProductById('sea-sponge');

    if (!product) {
      throw new Error('missing direct-add product fixture');
    }

    clearCart();

    const instance = createPageInstance(page);
    instance.onLoad({ productId: product.id });
    instance.onShow();

    expect(instance.data.quantity).toBe(1);
    expect(instance.data.cartCount).toBe(0);

    instance.handlePlus();
    expect(instance.data.quantity).toBe(2);
    expect(getCartProductQuantity(product.id)).toBe(0);
    expect(getCartCount()).toBe(0);

    instance.handleAddToCart();

    expect(getCartProductQuantity(product.id)).toBe(2);
    expect(getCartCount()).toBe(2);
    expect(instance.data.cartCount).toBe(2);
    expect(wx.showToast).toHaveBeenCalledWith(expect.objectContaining({ title: '已加入购物车' }));
  });

  it('requires spec selection before adding a spec product from detail', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { clearCart, getCartCount, getCartProductQuantity } = await import('../src/services/cart');
    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing spec product fixture');
    }

    clearCart();

    const instance = createPageInstance(page);
    instance.onLoad({ productId: product.id });

    expect(instance.data.isAddToCartDisabled).toBe(true);
    expect(instance.data.selectedSpecLabel).toBe('请选择规格信息');

    instance.handleAddToCart();
    expect(wx.showToast).toHaveBeenCalledWith(expect.objectContaining({ title: '请先选择规格信息' }));
    expect(getCartCount()).toBe(0);

    instance.handleSpecTap({
      currentTarget: {
        dataset: {
          specId: product.specs[1]?.id
        }
      }
    });
    instance.handlePlus();
    instance.handleAddToCart();

    expect(instance.data.isAddToCartDisabled).toBe(false);
    expect(getCartProductQuantity(product.id, product.specs[1]?.id ?? '')).toBe(2);
  });
});
