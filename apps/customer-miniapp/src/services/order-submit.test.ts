import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderRecord } from '@xiaipet/shared';

import { createAddress, resetAddresses, selectAddress } from './address';
import { CustomerApiError, type CustomerApiRequester, type CustomerApiRequestOptions } from './api-client';
import { addCartItem, clearCart, getCartItems } from './cart';
import {
  resetCheckoutDraft,
  setCheckoutRemark,
  setCustomNoticeAcknowledged,
  setReservationSelection,
  toggleSelectedPet
} from './checkout';
import { getProductById } from './catalog';
import { createPet, resetPets } from './pets';
import { resetProfile, updateProfile } from './profile';
import {
  buildCreateOrderPayload,
  getCheckoutPricingPreview,
  submitOrder
} from './order-submit';
import {
  getSelectedCheckoutGiftIds,
  hydrateCheckoutGifts,
  resetCheckoutGiftSelection,
  toggleCheckoutGiftSelection
} from './gifts';
import { resetCustomerRuntimeConfigCache } from './runtime-config';

function createOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order-001',
    openid: 'session-openid',
    status: 'pending_payment',
    paymentMethod: 'wechat',
    payment: {
      method: 'wechat',
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
    updatedAt: '2026-04-17T10:00:00.000Z',
    ...overrides
  };
}

function createCityAddressFixture() {
  return createAddress({
    type: 'city',
    recipientName: '奶油',
    phoneNumber: '13900001111',
    regionLabel: '上海市 黄浦区',
    detailAddress: '外滩 18 号 201',
    tag: '公司'
  });
}

function createPetFixture(name = '布丁') {
  return createPet({
    name,
    gender: 'female',
    birthday: '2023-04-12',
    allergyNotes: ''
  });
}

describe('order submit service', () => {
  beforeEach(() => {
    resetAddresses();
    clearCart();
    resetCheckoutDraft();
    resetPets();
    resetProfile();
    resetCustomerRuntimeConfigCache();
    resetCheckoutGiftSelection();
    updateProfile({ contactPhoneMasked: '138****1234' });
  });

  it('builds a delivery order payload with fee preview and frozen snapshot fields', () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();
    const pet = createPetFixture();

    if (!product || !address || !pet) {
      throw new Error('missing order fixtures');
    }

    addCartItem(product, product.specs[0]?.id ?? '', 2);
    selectAddress(address.id);
    toggleSelectedPet(pet.id);
    setReservationSelection({
      dateValue: '2026-04-17',
      dateLabel: '今天 04-17',
      timeValue: '10:30',
      timeLabel: '10:30'
    });
    setCustomNoticeAcknowledged(true);
    setCheckoutRemark('请提前联系');

    const pricing = getCheckoutPricingPreview();
    const payload = buildCreateOrderPayload('wechat', 'checkout-20260417-001');
    const expectedSubtotal = (product.specs[0]?.price ?? 0) * 2;

    expect(pricing).toMatchObject({
      itemsSubtotal: expectedSubtotal,
      deliveryFee: 0,
      payableTotal: expectedSubtotal
    });
    expect(payload.fulfillment).toMatchObject({
      mode: 'delivery',
      address: expect.objectContaining({
        id: address.id,
        recipientName: address.recipientName
      })
    });
    expect(payload.items[0]).toMatchObject({
      productId: product.id,
      quantity: 2,
      lineTotal: expectedSubtotal
    });
    expect(payload.pets).toEqual([
      expect.objectContaining({
        id: pet.id,
        name: pet.name,
        gender: pet.gender,
        birthday: pet.birthday,
        allergyNotes: pet.allergyNotes
      })
    ]);
    expect(payload.idempotencyKey).toBe('checkout-20260417-001');
    expect(payload).not.toHaveProperty('openid');
  });

  it('rejects order payload creation when selected cart items have no shared fulfillment mode', () => {
    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing incompatible fulfillment fixture');
    }

    addCartItem({ ...product, id: 'delivery-only', deliveryModes: ['delivery'] }, '', 1);
    addCartItem({ ...product, id: 'pickup-only', deliveryModes: ['pickup'] }, '', 1);

    expect(() => buildCreateOrderPayload('wechat', 'checkout-incompatible')).toThrow('INCOMPATIBLE_FULFILLMENT');
  });

  it('rejects delivery order payload creation when selected goods are below the matched minimum amount', () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();

    if (!product || !address) {
      throw new Error('missing minimum delivery fixtures');
    }

    addCartItem({ ...product, price: 22.8, specs: [] }, '', 1);
    selectAddress(address.id);
    setCustomNoticeAcknowledged(true);
    setReservationSelection({
      dateValue: '2026-04-17',
      dateLabel: '今天 04-17',
      timeValue: '11:00',
      timeLabel: '11:00'
    });

    expect(() => buildCreateOrderPayload('wechat', 'checkout-below-minimum')).toThrow('DELIVERY_MINIMUM_NOT_MET');
  });

  it('rejects delivery order payload creation when the selected city address is outside configured tiers', () => {
    const product = getProductById('ocean-party');
    const address = createAddress({
      type: 'city',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '浙江省 杭州市',
      detailAddress: '文三路 90 号',
      tag: '家',
      latitude: 30.2767,
      longitude: 120.1258
    });

    if (!product || !address) {
      throw new Error('missing out-of-range delivery fixtures');
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

    expect(() => buildCreateOrderPayload('wechat', 'checkout-out-of-range')).toThrow('DELIVERY_OUT_OF_RANGE');
  });

  it('includes the bound profile contact phone in delivery order fulfillment snapshots', () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();

    if (!product || !address) {
      throw new Error('missing delivery contact fixtures');
    }

    updateProfile({ contactPhoneMasked: '138****1234' });
    addCartItem(product, product.specs[0]?.id ?? '', 1);
    selectAddress(address.id);
    setReservationSelection({
      dateValue: '2026-04-17',
      dateLabel: '今天 04-17',
      timeValue: '11:00',
      timeLabel: '11:00'
    });
    setCustomNoticeAcknowledged(true);

    const payload = buildCreateOrderPayload('wechat', 'checkout-delivery-contact');

    expect(payload.fulfillment).toMatchObject({
      mode: 'delivery',
      contactPhone: address.phoneNumber
    });
  });

  it('creates a balance order and returns the paid order from the HTTP payment route', async () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();

    if (!product || !address) {
      throw new Error('missing submit fixtures');
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

    const request = vi.fn(async (path: string, _options?: CustomerApiRequestOptions) => {
      if (path === '/api/v1/customer/orders') {
        return {
          ok: true,
          order: createOrder({
            paymentMethod: 'balance',
            payment: {
              method: 'balance',
              status: 'pending'
            }
          })
        };
      }
      if (path === '/api/v1/customer/orders/order-001/payment') {
        return {
          ok: true,
          paymentStatus: 'paid',
          order: createOrder({
            status: 'paid',
            paymentMethod: 'balance',
            payment: {
              method: 'balance',
              status: 'paid'
            }
          }),
          balanceAfter: 222
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(
      submitOrder('balance', request as CustomerApiRequester, { idempotencyKey: 'checkout-20260417-001' })
    ).resolves.toMatchObject({
      order: {
        id: 'order-001',
        status: 'paid'
      },
      payment: {
        paymentStatus: 'paid',
        balanceAfter: 222
      }
    });

    expect(request).toHaveBeenNthCalledWith(1, '/api/v1/customer/orders', {
      method: 'POST',
      body: expect.objectContaining({
        idempotencyKey: 'checkout-20260417-001',
        paymentMethod: 'balance'
      }),
      auth: 'customer'
    });
    expect(request).toHaveBeenNthCalledWith(2, '/api/v1/customer/orders/order-001/payment', {
      method: 'POST',
      body: {
        paymentMethod: 'balance'
      },
      auth: 'customer'
    });
    expect(getCartItems()).toEqual([]);
  });

  it('includes selected checkout gift ids when creating an order', async () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();

    if (!product || !address) {
      throw new Error('missing gift order fixtures');
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

    await hydrateCheckoutGifts((async () => ({
      ok: true,
      gifts: [
        {
          id: 'gift-1',
          status: 'available',
          displayGroup: 'available',
          giftSnapshot: {
            name: '生日蛋糕',
            description: '可兑换生日蛋糕',
            validDays: 365
          },
          expiresAt: '2027-06-16T00:00:00.000Z'
        }
      ]
    })) as CustomerApiRequester);
    toggleCheckoutGiftSelection('gift-1');

    const request = vi.fn(async (path: string, _options?: CustomerApiRequestOptions) => {
      if (path === '/api/v1/customer/orders') {
        return {
          ok: true,
          order: createOrder({
            paymentMethod: 'balance',
            payment: {
              method: 'balance',
              status: 'pending'
            }
          })
        };
      }
      if (path === '/api/v1/customer/orders/order-001/payment') {
        return {
          ok: true,
          paymentStatus: 'paid',
          order: createOrder({
            status: 'paid',
            paymentMethod: 'balance',
            payment: {
              method: 'balance',
              status: 'paid'
            }
          })
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await submitOrder('balance', request as CustomerApiRequester, { idempotencyKey: 'checkout-with-gift' });

    const createOrderPayload = request.mock.calls[0]?.[1]?.body as Record<string, unknown>;

    expect(createOrderPayload).toEqual(expect.objectContaining({
      idempotencyKey: 'checkout-with-gift',
      selectedGiftIds: ['gift-1']
    }));
    expect(createOrderPayload).not.toHaveProperty('gifts');
    expect(JSON.stringify(createOrderPayload)).not.toContain('giftSnapshot');
    expect(getSelectedCheckoutGiftIds()).toEqual([]);
    expect(request).toHaveBeenNthCalledWith(1, '/api/v1/customer/orders', {
      method: 'POST',
      body: createOrderPayload,
      auth: 'customer'
    });
  });

  it('opens WeChat payment before syncing a pending WeChat payment', async () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();

    if (!product || !address) {
      throw new Error('missing submit fixtures');
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
    await hydrateCheckoutGifts((async () => ({
      ok: true,
      gifts: [
        {
          id: 'gift-wechat',
          status: 'available',
          displayGroup: 'available',
          giftSnapshot: {
            name: '庆祝蛋糕',
            description: '可兑换庆祝蛋糕',
            validDays: 180
          },
          expiresAt: '2027-06-16T00:00:00.000Z'
        }
      ]
    })) as CustomerApiRequester);
    toggleCheckoutGiftSelection('gift-wechat');

    const requestPayment = vi.fn((options: Record<string, unknown>) => {
      (options.success as () => void)?.();
    });
    vi.stubGlobal('wx', { requestPayment });

    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/orders') {
        return {
          ok: true,
          order: createOrder()
        };
      }
      if (path === '/api/v1/customer/orders/order-001/payment') {
        return {
          ok: true,
          paymentStatus: 'pending_wechat',
          paymentParams: {
            timeStamp: '123',
            nonceStr: 'nonce-1',
            package: 'prepay_id=prepay-1',
            signType: 'RSA',
            paySign: 'pay-sign-1'
          },
          order: createOrder({
            status: 'payment_processing',
            payment: {
              method: 'wechat',
              status: 'processing'
            }
          })
        };
      }
      if (path === '/api/v1/customer/orders/order-001/payment-sync') {
        return {
          ok: true,
          order: createOrder({
            status: 'paid',
            payment: {
              method: 'wechat',
              status: 'paid'
            }
          })
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(
      submitOrder('wechat', request as CustomerApiRequester, { idempotencyKey: 'checkout-20260417-002' })
    ).resolves.toMatchObject({
      order: {
        id: 'order-001',
        status: 'paid'
      },
      payment: {
        paymentStatus: 'pending_wechat'
      }
    });

    expect(request).toHaveBeenNthCalledWith(3, '/api/v1/customer/orders/order-001/payment-sync', {
      method: 'POST',
      auth: 'customer'
    });
    expect(requestPayment).toHaveBeenCalledWith(expect.objectContaining({
      timeStamp: '123',
      nonceStr: 'nonce-1',
      package: 'prepay_id=prepay-1',
      signType: 'RSA',
      paySign: 'pay-sign-1'
    }));
    expect(getSelectedCheckoutGiftIds()).toEqual([]);
    expect(getCartItems()).toEqual([]);
  });

  it('cancels an unpaid WeChat order to release locked gifts when payment is cancelled', async () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();

    if (!product || !address) {
      throw new Error('missing submit fixtures');
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
    await hydrateCheckoutGifts((async () => ({
      ok: true,
      gifts: [
        {
          id: 'gift-wechat-cancel',
          status: 'available',
          displayGroup: 'available',
          giftSnapshot: {
            name: '庆祝蛋糕',
            description: '可兑换庆祝蛋糕',
            validDays: 180
          },
          expiresAt: '2027-06-16T00:00:00.000Z'
        }
      ]
    })) as CustomerApiRequester);
    toggleCheckoutGiftSelection('gift-wechat-cancel');

    const requestPayment = vi.fn((options: Record<string, unknown>) => {
      (options.fail as () => void)?.();
    });
    vi.stubGlobal('wx', { requestPayment });

    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/orders') {
        return {
          ok: true,
          order: createOrder()
        };
      }
      if (path === '/api/v1/customer/orders/order-001/payment') {
        return {
          ok: true,
          paymentStatus: 'pending_wechat',
          paymentParams: {
            timeStamp: '123',
            nonceStr: 'nonce-1',
            package: 'prepay_id=prepay-1',
            signType: 'RSA',
            paySign: 'pay-sign-1'
          },
          order: createOrder({
            status: 'payment_processing',
            payment: {
              method: 'wechat',
              status: 'processing'
            }
          })
        };
      }
      if (path === '/api/v1/customer/orders/order-001/cancel') {
        return {
          ok: true,
          order: createOrder({
            status: 'cancelled'
          })
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(
      submitOrder('wechat', request as CustomerApiRequester, { idempotencyKey: 'checkout-wechat-cancel' })
    ).rejects.toThrow('WECHAT_PAY_CANCELLED');

    expect(request).toHaveBeenCalledWith('/api/v1/customer/orders/order-001/cancel', {
      method: 'POST',
      auth: 'customer'
    });
    expect(getSelectedCheckoutGiftIds()).toEqual([]);
    expect(getCartItems()).toHaveLength(1);
    expect(getCartItems()[0]).toMatchObject({
      productId: product.id,
      selected: true
    });
  });

  it('does not cancel a WeChat order after payment succeeds but settlement sync fails', async () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();

    if (!product || !address) {
      throw new Error('missing submit fixtures');
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

    const requestPayment = vi.fn((options: Record<string, unknown>) => {
      (options.success as () => void)?.();
    });
    vi.stubGlobal('wx', { requestPayment });

    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/orders') {
        return {
          ok: true,
          order: createOrder()
        };
      }
      if (path === '/api/v1/customer/orders/order-001/payment') {
        return {
          ok: true,
          paymentStatus: 'pending_wechat',
          paymentParams: {
            timeStamp: '123',
            nonceStr: 'nonce-1',
            package: 'prepay_id=prepay-1',
            signType: 'RSA',
            paySign: 'pay-sign-1'
          },
          order: createOrder({
            status: 'payment_processing',
            payment: {
              method: 'wechat',
              status: 'processing'
            }
          })
        };
      }
      if (path === '/api/v1/customer/orders/order-001/payment-sync') {
        throw new Error('sync_payment_failed');
      }
      if (path === '/api/v1/customer/orders/order-001/cancel') {
        return {
          ok: true,
          order: createOrder({
            status: 'cancelled'
          })
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(
      submitOrder('wechat', request as CustomerApiRequester, { idempotencyKey: 'checkout-sync-failed' })
    ).rejects.toThrow('sync_payment_failed');

    expect(request).not.toHaveBeenCalledWith('/api/v1/customer/orders/order-001/cancel', expect.anything());
  });

  it('surfaces insufficient balance as a stable service error code', async () => {
    const product = getProductById('ocean-party');
    const address = createCityAddressFixture();

    if (!product || !address) {
      throw new Error('missing submit fixtures');
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

    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/orders') {
        return {
          ok: true,
          order: createOrder({
            paymentMethod: 'balance'
          })
        };
      }
      throw new CustomerApiError('INSUFFICIENT_BALANCE', 'Insufficient balance', 200);
    });

    await expect(
      submitOrder('balance', request as CustomerApiRequester, { idempotencyKey: 'checkout-20260417-003' })
    ).rejects.toThrow('INSUFFICIENT_BALANCE');
  });
});
