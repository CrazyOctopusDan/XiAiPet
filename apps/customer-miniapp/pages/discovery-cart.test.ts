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
    const catalogSource = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.ts',
      'utf8'
    );

    expect(catalogTemplate).toContain('class="search-icon"');
    expect(catalogTemplate).toContain('class="cart-float-icon"');
    expect(catalogTemplate).toContain('商品暂未上架');
    expect(catalogTemplate).toContain('wx:if="{{!sections.length}}"');
    expect(catalogTemplate).toContain('bindtap="handleLoadMoreAvailable"');
    expect(catalogTemplate).toContain('bindtap="handleLoadMoreSoldOut"');
    expect(catalogTemplate).toContain('bindtap="handleToggleSoldOut"');
    expect(catalogTemplate).toMatch(/class="product-card soldout"[\s\S]*?class="product-price"/);
    expect(catalogSource).toContain('loadCategoryProducts');
    expect(catalogSource).not.toContain('hydrateCatalog()');
    expect(catalogStyles).toContain('linear-gradient(180deg, #FFFDF5 0%, #FFF9DF 58%, #F6E396 100%)');
    expect(catalogStyles).toContain('background: #F6E396');
    expect(catalogStyles).toContain('.catalog-empty');
    expect(catalogStyles).toContain('.catalog-load-more');
    expect(catalogStyles).toMatch(/\.soldout-grid \{[\s\S]*?margin-top: 18rpx/);
    expect(catalogStyles).toMatch(/\.soldout-stamp \{[\s\S]*?color: #FFFFFF/);
    expect(catalogStyles).toContain('border: 4rpx solid #40535C');
    expect(catalogStyles).toContain('background: #40535C');
    expect(catalogStyles).toMatch(/\.product-price \{[\s\S]*?bottom: 16rpx;[\s\S]*?height: 60rpx/);
    expect(catalogStyles).toContain('bottom: calc(42rpx + env(safe-area-inset-bottom))');
    expect(catalogStyles).toContain('align-items: center');
    expect(catalogStyles).toContain('padding: calc(96rpx + env(safe-area-inset-top)) 24rpx calc(96rpx + env(safe-area-inset-bottom))');
    expect(catalogStyles).toContain('.quick-buy-submit::after');
  });

  it('hydrates the catalog page with the first available page for every customer category on load', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories?deliveryMode=delivery') {
        return {
          ok: true,
          snapshotKey: 'merchant-seasonal-categories',
          categories: [
            {
              id: 'merchant-seasonal',
              name: '节日限定',
              iconToken: '节',
              availableCount: 1,
              soldOutCount: 0
            },
            {
              id: 'merchant-empty-delivery',
              name: '当前履约无商品',
              iconToken: '空',
              availableCount: 0,
              soldOutCount: 0
            },
            {
              id: 'merchant-cakes',
              name: '宠物蛋糕',
              iconToken: '糕',
              availableCount: 1,
              soldOutCount: 0
            }
          ]
        };
      }

      if (path === '/api/v1/customer/catalog/categories/merchant-seasonal/products?deliveryMode=delivery&availability=available&limit=20') {
        return {
          ok: true,
          categoryId: 'merchant-seasonal',
          availability: 'available',
          items: [
            {
              id: 'merchant-seasonal-cake',
              name: '南瓜小蛋糕',
              summary: '商户配置商品',
              categoryId: 'merchant-seasonal',
              minPrice: 98,
              stock: 8,
              soldOut: false,
              cartActionLabel: '直接加购',
              memberLevelLabel: '普通会员可购',
              thumbnail: '',
              specs: [],
              fulfillmentModes: ['delivery'],
              updatedAt: '2026-05-16T00:00:00.000Z'
            }
          ],
          pageInfo: { hasMore: false, nextCursor: null }
        };
      }

      if (path === '/api/v1/customer/catalog/categories/merchant-cakes/products?deliveryMode=delivery&availability=available&limit=20') {
        return {
          ok: true,
          categoryId: 'merchant-cakes',
          availability: 'available',
          items: [
            {
              id: 'merchant-birthday-cake',
              name: '生日蛋糕',
              summary: '默认加载的第二个品类商品',
              categoryId: 'merchant-cakes',
              minPrice: 168,
              stock: 5,
              soldOut: false,
              cartActionLabel: '选规格',
              memberLevelLabel: '普通会员可购',
              thumbnail: '',
              specs: [{ id: 'small', label: '小号', price: 168, stock: 5 }],
              fulfillmentModes: ['delivery'],
              updatedAt: '2026-05-16T00:00:00.000Z'
            }
          ],
          pageInfo: { hasMore: false, nextCursor: null }
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

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/catalog/categories?deliveryMode=delivery', {
      method: 'GET',
      auth: 'none'
    });
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/customer/catalog/categories/merchant-seasonal/products?deliveryMode=delivery&availability=available&limit=20',
      {
        method: 'GET',
        auth: 'none'
      }
    );
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/customer/catalog/categories/merchant-cakes/products?deliveryMode=delivery&availability=available&limit=20',
      {
        method: 'GET',
        auth: 'none'
      }
    );
    expect(apiRequest).not.toHaveBeenCalledWith('/api/v1/customer/catalog/products', {
      method: 'GET',
      auth: 'none'
    });
    expect(instance.data.categories).toEqual([
      expect.objectContaining({
        id: 'merchant-seasonal',
        name: '节日限定',
        shortName: '节日限定',
        iconText: '节'
      }),
      expect.objectContaining({
        id: 'merchant-empty-delivery',
        name: '当前履约无商品',
        shortName: '当前履约无商品',
        iconText: '空'
      }),
      expect.objectContaining({
        id: 'merchant-cakes',
        name: '宠物蛋糕',
        shortName: '宠物蛋糕',
        iconText: '糕'
      })
    ]);
    expect(instance.data.sections[0]?.category.id).toBe('merchant-seasonal');
    expect(instance.data.sections[0]?.availableProducts[0]?.name).toBe('南瓜小蛋糕');
    expect(instance.data.sections.map((section: { category: { id: string } }) => section.category.id)).toEqual([
      'merchant-seasonal',
      'merchant-cakes'
    ]);
    expect(instance.data.sections[1]?.availableProducts[0]?.name).toBe('生日蛋糕');
  });

  it('rebuilds hydrated catalog sections when returning from product detail', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories?deliveryMode=delivery') {
        return {
          ok: true,
          categories: [
            {
              id: 'merchant-seasonal',
              name: '节日限定',
              iconToken: '节',
              availableCount: 1,
              soldOutCount: 0
            }
          ]
        };
      }

      if (path === '/api/v1/customer/catalog/categories/merchant-seasonal/products?deliveryMode=delivery&availability=available&limit=20') {
        return {
          ok: true,
          items: [
            {
              id: 'merchant-seasonal-cake',
              name: '南瓜小蛋糕',
              summary: '商户配置商品',
              categoryId: 'merchant-seasonal',
              minPrice: 98,
              stock: 8,
              soldOut: false,
              cartActionLabel: '直接加购',
              memberLevelLabel: '普通会员可购',
              thumbnail: '',
              fulfillmentModes: ['delivery'],
              updatedAt: '2026-05-16T00:00:00.000Z',
              specs: []
            }
          ],
          pageInfo: { hasMore: false, nextCursor: null }
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
    expect(detailTemplate).toContain('class="detail-image" mode="aspectFill"');
    expect(detailTemplate).toContain('style="height: {{swiperHeightRpx}}rpx;"');
    expect(detailTemplate).toContain('bindload="handleGalleryImageLoad"');
    expect(detailStyles).toContain('linear-gradient(180deg, #FFFDF5 0%, #FFF9DF 58%, #F6E396 100%)');
    expect(detailStyles).toContain('margin-top: -74rpx');
    expect(detailStyles).toContain('.stepper-btn::before');
    expect(detailStyles).toContain('.stepper-btn.plus::after');
    expect(detailStyles).toMatch(/\.add-cart-button\.disabled \{[\s\S]*?background: #F6E396/);
    expect(detailStyles).toContain('padding: 22rpx 24rpx calc(24rpx + env(safe-area-inset-bottom))');
    expect(detailStyles).toContain('.add-cart-button::after');
  });

  it('uses the cart stepper button implementation on the catalog page', async () => {
    const { readFile } = await import('node:fs/promises');
    const catalogTemplate = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.wxml',
      'utf8'
    );
    const catalogStyles = await readFile(
      '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.wxss',
      'utf8'
    );

    expect(catalogTemplate).not.toContain('stepper-circle');
    expect(catalogTemplate).toContain('class="stepper-btn"');
    expect(catalogStyles).toContain('.stepper-btn::before');
    expect(catalogStyles).toContain('.stepper-btn.plus::after');
    expect(catalogStyles).toMatch(/\.stepper-btn \{[\s\S]*?font-size: 0/);
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

  it('enables right-top menu sharing on product detail without a custom image', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const product = getProductById('sea-sponge');

    if (!product) {
      throw new Error('missing direct-add product fixture');
    }

    const instance = createPageInstance(page);
    instance.onLoad({ productId: product.id });

    expect(wx.showShareMenu).toHaveBeenCalledWith({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });

    const sharePayload = instance.onShareAppMessage();

    expect(sharePayload).toEqual({
      title: product.name,
      path: `/pages/product-detail/index?productId=${product.id}`
    });
    expect(sharePayload).not.toHaveProperty('imageUrl');
  });

  it('sizes the detail swiper from the tallest gallery photo metadata', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.ts');
    const instance = createPageInstance(page);

    instance.applyProduct({
      id: 'dynamic-gallery',
      name: '动态高度商品',
      summary: '默认规格',
      description: '图片高度不同',
      price: 12,
      stock: 10,
      soldOut: false,
      cartActionLabel: '直接加购',
      memberLevelLabel: '普通会员可购',
      categoryId: 'cakes',
      deliveryModes: ['delivery'],
      thumbnail: '',
      gallery: ['https://assets.example.test/wide.jpg', 'https://assets.example.test/tall.jpg'],
      introductionImageAssets: [
        {
          provider: 'oss',
          role: 'product-introduction',
          bucket: 'bucket',
          region: 'oss-cn-hangzhou',
          objectKey: 'wide.jpg',
          url: 'https://assets.example.test/wide.jpg',
          width: 1000,
          height: 500,
          sizeBytes: 1000,
          contentType: 'image/jpeg',
          uploadedAt: '2026-05-11T00:00:00.000Z',
          variants: []
        },
        {
          provider: 'oss',
          role: 'product-introduction',
          bucket: 'bucket',
          region: 'oss-cn-hangzhou',
          objectKey: 'tall.jpg',
          url: 'https://assets.example.test/tall.jpg',
          width: 600,
          height: 900,
          sizeBytes: 1000,
          contentType: 'image/jpeg',
          uploadedAt: '2026-05-11T00:00:00.000Z',
          variants: []
        }
      ],
      detailImages: [],
      specs: []
    });

    expect(instance.data.swiperHeightRpx).toBe(1125);
  });

  it('updates the detail swiper height from loaded image dimensions when metadata is missing', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/product-detail/index.ts');
    const instance = createPageInstance(page);

    instance.applyProduct({
      id: 'legacy-gallery',
      name: '旧图商品',
      summary: '默认规格',
      description: '只有图片地址',
      price: 12,
      stock: 10,
      soldOut: false,
      cartActionLabel: '直接加购',
      memberLevelLabel: '普通会员可购',
      categoryId: 'cakes',
      deliveryModes: ['delivery'],
      thumbnail: '',
      gallery: ['https://assets.example.test/legacy.jpg'],
      detailImages: [],
      specs: []
    });

    expect(instance.data.swiperHeightRpx).toBe(670);

    instance.handleGalleryImageLoad({
      currentTarget: {
        dataset: {
          index: 0
        }
      },
      detail: {
        width: 600,
        height: 900
      }
    });

    expect(instance.data.swiperHeightRpx).toBe(1125);
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
