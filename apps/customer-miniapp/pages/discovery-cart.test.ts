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
