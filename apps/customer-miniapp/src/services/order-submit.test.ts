import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderRecord } from '@xiaipet/shared';

import { getAddresses, resetAddresses, selectAddress } from './address';
import { CustomerApiError, type CustomerApiRequester } from './api-client';
import { addCartItem, clearCart } from './cart';
import {
  resetCheckoutDraft,
  setCheckoutRemark,
  setCustomNoticeAcknowledged,
  setReservationSelection,
  toggleSelectedPet
} from './checkout';
import { getProductById } from './catalog';
import { resetPets, getPets } from './pets';
import { resetProfile } from './profile';
import {
  buildCreateOrderPayload,
  getCheckoutPricingPreview,
  submitOrder
} from './order-submit';

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

describe('order submit service', () => {
  beforeEach(() => {
    resetAddresses();
    clearCart();
    resetCheckoutDraft();
    resetPets();
    resetProfile();
  });

  it('builds a delivery order payload with fee preview and frozen snapshot fields', () => {
    const product = getProductById('ocean-party');
    const address = getAddresses('city')[0];
    const pet = getPets()[0];

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
      deliveryFee: 10,
      payableTotal: expectedSubtotal + 10
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
        name: pet.name
      })
    ]);
    expect(payload.idempotencyKey).toBe('checkout-20260417-001');
    expect(payload).not.toHaveProperty('openid');
  });

  it('creates a balance order and returns the paid order from the HTTP payment route', async () => {
    const product = getProductById('sea-sponge');
    const address = getAddresses('city')[0];

    if (!product || !address) {
      throw new Error('missing submit fixtures');
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

    const request = vi.fn(async (path: string) => {
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
  });

  it('syncs WeChat payment when the payment route returns a pending status', async () => {
    const product = getProductById('sea-sponge');
    const address = getAddresses('city')[0];

    if (!product || !address) {
      throw new Error('missing submit fixtures');
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
            timeStamp: '123'
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
  });

  it('surfaces insufficient balance as a stable service error code', async () => {
    const product = getProductById('sea-sponge');
    const address = getAddresses('city')[0];

    if (!product || !address) {
      throw new Error('missing submit fixtures');
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
