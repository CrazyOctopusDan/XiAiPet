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
    redirectTo: vi.fn(),
    cloud: {
      callFunction: vi.fn().mockResolvedValue({
        result: {
          ok: true,
          banner: null,
          store: null,
          customNotice: null,
          deliveryRules: null
        }
      })
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

    clearCart();

    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 1);

    const instance = createPageInstance(page);
    instance.onShow();
    instance.handleCheckout();

    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/checkout/index?source=cart'
    });
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

  it('hydrates checkout runtime config from readRuntimeConfig and hides disabled notices', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');

    wx.cloud.callFunction.mockResolvedValueOnce({
      result: {
        ok: true,
        banner: null,
        store: {
          address: '上海市徐汇区永嘉路 88 号',
          latitude: 31.205,
          longitude: 121.44,
          contactPhone: '13600000000'
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
      }
    });

    const instance = createPageInstance(page);
    await instance.refreshRuntimeConfig();

    expect(wx.cloud.callFunction).toHaveBeenCalledWith({
      name: 'readRuntimeConfig',
      data: {}
    });
    expect(instance.data.storeAddress).toBe('上海市徐汇区永嘉路 88 号');
    expect(instance.data.customNotice).toBe('');
    expect(instance.data.deliveryRuleRows).toEqual(['5.0 公里内 98 元起送，配送费 0 元']);
  });

  it('shows the selected address summary on the checkout handoff page', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { clearCart } = await import('../src/services/cart');
    const { getAddresses, resetAddresses, selectAddress, setCheckoutAddressType } = await import('../src/services/address');

    clearCart();
    resetAddresses();

    const cityAddress = getAddresses('city')[0];

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

  it('exposes delivery, pickup, and express fulfillment modes on the checkout page', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const instance = createPageInstance(page);

    instance.onShow();

    expect(instance.data.fulfillmentModes.map((item: { value: string }) => item.value)).toEqual([
      'delivery',
      'pickup',
      'express'
    ]);
    expect(instance.data.activeFulfillmentMode).toBe('delivery');
  });

  it('navigates from checkout into the dedicated remark editor', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const instance = createPageInstance(page);

    instance.handleRemarkTap();

    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/checkout-remark/index'
    });
  });

  it('shows wechat and balance payment methods on the checkout page', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const instance = createPageInstance(page);

    instance.onShow();

    expect(instance.data.paymentMethods.map((item: { value: string }) => item.value)).toEqual([
      'wechat',
      'balance'
    ]);
    expect(instance.data.activePaymentMethod).toBe('wechat');
  });

  it('redirects to the orders page after a successful checkout submit', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { getAddresses, resetAddresses, selectAddress } = await import('../src/services/address');
    const { resetCheckoutDraft, setCustomNoticeAcknowledged, setReservationSelection } = await import('../src/services/checkout');

    clearCart();
    resetAddresses();
    resetCheckoutDraft();

    const product = getProductById('sea-sponge');
    const address = getAddresses('city')[0];

    if (!product || !address) {
      throw new Error('missing checkout submit fixtures');
    }

    addCartItem(product, '', 1);
    selectAddress(address.id);
    setCustomNoticeAcknowledged(true);
    setReservationSelection({
      dateValue: '2026-04-17',
      dateLabel: '今天 04-17',
      timeValue: '11:00',
      timeLabel: '11:00'
    });

    wx.cloud.callFunction
      .mockResolvedValueOnce({
        result: {
          ok: true,
          banner: null,
          store: null,
          customNotice: null,
          deliveryRules: null
        }
      })
      .mockResolvedValueOnce({
        result: {
          ok: true,
          order: {
            id: 'order-001',
            status: 'pending_payment',
            paymentMethod: 'balance',
            payment: {
              method: 'balance',
              status: 'pending'
            },
            pricing: {
              itemsSubtotal: 36,
              deliveryFee: 10,
              payableTotal: 46
            },
            snapshot: {
              fulfillment: {
                mode: 'delivery',
                address: {
                  id: address.id,
                  recipientName: address.recipientName,
                  phoneNumber: address.phoneNumber,
                  regionLabel: address.regionLabel,
                  detailAddress: address.detailAddress,
                  tag: address.tag
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
                  productId: product.id,
                  name: product.name,
                  quantity: 1,
                  unitPrice: 36,
                  specId: '',
                  specLabel: '',
                  lineTotal: 36
                }
              ],
              pets: [],
              remark: ''
            },
            createdAt: '2026-04-17T10:00:00.000Z',
            updatedAt: '2026-04-17T10:00:00.000Z'
          }
        }
      })
      .mockResolvedValueOnce({
        result: {
          ok: true,
          paymentStatus: 'paid',
          order: {
            id: 'order-001',
            status: 'paid',
            paymentMethod: 'balance',
            payment: {
              method: 'balance',
              status: 'paid'
            },
            pricing: {
              itemsSubtotal: 36,
              deliveryFee: 10,
              payableTotal: 46
            },
            snapshot: {
              fulfillment: {
                mode: 'delivery',
                address: {
                  id: address.id,
                  recipientName: address.recipientName,
                  phoneNumber: address.phoneNumber,
                  regionLabel: address.regionLabel,
                  detailAddress: address.detailAddress,
                  tag: address.tag
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
                  productId: product.id,
                  name: product.name,
                  quantity: 1,
                  unitPrice: 36,
                  specId: '',
                  specLabel: '',
                  lineTotal: 36
                }
              ],
              pets: [],
              remark: ''
            },
            createdAt: '2026-04-17T10:00:00.000Z',
            updatedAt: '2026-04-17T10:01:00.000Z'
          }
        }
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

    expect(wx.redirectTo).toHaveBeenCalledWith({
      url: '/pages/orders/index?highlightOrderId=order-001'
    });
  });

  it('ignores repeated submit taps while the checkout request is still in flight', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');
    const { getAddresses, resetAddresses, selectAddress } = await import('../src/services/address');
    const { resetCheckoutDraft, setCustomNoticeAcknowledged, setReservationSelection } = await import('../src/services/checkout');

    clearCart();
    resetAddresses();
    resetCheckoutDraft();

    const product = getProductById('sea-sponge');
    const address = getAddresses('city')[0];

    if (!product || !address) {
      throw new Error('missing checkout submit fixtures');
    }

    addCartItem(product, '', 1);
    selectAddress(address.id);
    setCustomNoticeAcknowledged(true);
    setReservationSelection({
      dateValue: '2026-04-17',
      dateLabel: '今天 04-17',
      timeValue: '11:00',
      timeLabel: '11:00'
    });

    let resolvePayment: ((value: { result: Record<string, unknown> }) => void) | null = null;
    wx.cloud.callFunction
      .mockResolvedValueOnce({
        result: {
          ok: true,
          banner: null,
          store: null,
          customNotice: null,
          deliveryRules: null
        }
      })
      .mockResolvedValueOnce({
        result: {
          ok: true,
          order: {
            id: 'order-001',
            status: 'pending_payment',
            paymentMethod: 'balance',
            payment: {
              method: 'balance',
              status: 'pending'
            },
            pricing: {
              itemsSubtotal: 36,
              deliveryFee: 10,
              payableTotal: 46
            },
            snapshot: {
              fulfillment: {
                mode: 'delivery',
                address: {
                  id: address.id,
                  recipientName: address.recipientName,
                  phoneNumber: address.phoneNumber,
                  regionLabel: address.regionLabel,
                  detailAddress: address.detailAddress,
                  tag: address.tag
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
                  productId: product.id,
                  name: product.name,
                  quantity: 1,
                  unitPrice: 36,
                  specId: '',
                  specLabel: '',
                  lineTotal: 36
                }
              ],
              pets: [],
              remark: ''
            },
            createdAt: '2026-04-17T10:00:00.000Z',
            updatedAt: '2026-04-17T10:00:00.000Z'
          }
        }
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePayment = resolve;
          })
      );

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

    expect(wx.cloud.callFunction).toHaveBeenCalledTimes(3);

    if (resolvePayment) {
      (resolvePayment as (value: { result: Record<string, unknown> }) => void)({
        result: {
          ok: true,
          paymentStatus: 'paid',
          order: {
            id: 'order-001',
            status: 'paid',
            paymentMethod: 'balance',
            payment: {
              method: 'balance',
              status: 'paid'
            },
            pricing: {
              itemsSubtotal: 36,
              deliveryFee: 10,
              payableTotal: 46
            },
            snapshot: {
              fulfillment: {
                mode: 'delivery',
                address: {
                  id: address.id,
                  recipientName: address.recipientName,
                  phoneNumber: address.phoneNumber,
                  regionLabel: address.regionLabel,
                  detailAddress: address.detailAddress,
                  tag: address.tag
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
                  productId: product.id,
                  name: product.name,
                  quantity: 1,
                  unitPrice: 36,
                  specId: '',
                  specLabel: '',
                  lineTotal: 36
                }
              ],
              pets: [],
              remark: ''
            },
            createdAt: '2026-04-17T10:00:00.000Z',
            updatedAt: '2026-04-17T10:01:00.000Z'
          }
        }
      });
    }

    await Promise.all([firstSubmit, secondSubmit]);
    expect(wx.cloud.callFunction).toHaveBeenCalledTimes(3);
  });
});
