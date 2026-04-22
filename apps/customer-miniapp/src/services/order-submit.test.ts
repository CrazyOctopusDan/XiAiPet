import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAddresses, resetAddresses, selectAddress } from './address';
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
  });

  it('creates an order then pays it through the backend payOrder flow', async () => {
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

    const callFunction = vi
      .fn()
      .mockResolvedValueOnce({
        result: {
          ok: true,
          order: {
            id: 'order-001',
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
            }
          }
        }
      })
      .mockResolvedValueOnce({
        result: {
          ok: false,
          code: 'WECHAT_PAY_NOT_CONFIGURED',
          order: {
            id: 'order-001',
            status: 'pending_payment'
          }
        }
      });

    await expect(submitOrder('wechat', callFunction, { idempotencyKey: 'checkout-20260417-001' })).rejects.toThrow(
      'WECHAT_PAY_NOT_CONFIGURED'
    );

    expect(callFunction).toHaveBeenNthCalledWith(1, {
      name: 'createOrder',
      data: {
        payload: expect.objectContaining({
          idempotencyKey: 'checkout-20260417-001',
          paymentMethod: 'wechat'
        })
      }
    });
    expect(callFunction).toHaveBeenNthCalledWith(2, {
      name: 'payOrder',
      data: {
        orderId: 'order-001'
      }
    });
  });
});
