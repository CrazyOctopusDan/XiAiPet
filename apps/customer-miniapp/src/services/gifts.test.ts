import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserGiftView } from '@xiaipet/shared';

import type { CustomerApiRequester } from './api-client';
import {
  getCheckoutGiftOptions,
  getMyGiftGroups,
  getSelectedCheckoutGiftIds,
  getSelectedCheckoutGiftSummary,
  hydrateCheckoutGifts,
  hydrateMyGifts,
  resetCheckoutGiftSelection,
  toggleCheckoutGiftSelection
} from './gifts';

function createGift(overrides: Partial<UserGiftView> = {}): UserGiftView {
  return {
    id: 'gift-1',
    status: 'available',
    displayGroup: 'available',
    giftSnapshot: {
      name: '生日蛋糕',
      description: '可兑换生日蛋糕',
      validDays: 365
    },
    expiresAt: '2027-06-16T00:00:00.000Z',
    ...overrides
  };
}

describe('gifts service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetCheckoutGiftSelection();
  });

  it('hydrates my gifts into display groups and returns cloned groups', async () => {
    const availableGift = createGift();
    const redeemedGift = createGift({
      id: 'gift-redeemed',
      status: 'redeemed',
      displayGroup: 'redeemed'
    });
    const request = vi.fn(async () => ({
      ok: true,
      groups: {
        available: [availableGift],
        locked: [],
        redeemed: [redeemedGift],
        expired: []
      }
    }));

    const groups = await hydrateMyGifts(request as CustomerApiRequester);
    groups.available[0].giftSnapshot.name = 'mutated by caller';

    expect(getMyGiftGroups().available[0].giftSnapshot.name).toBe('生日蛋糕');
    expect(getMyGiftGroups()).toMatchObject({
      available: [expect.objectContaining({ id: 'gift-1' })],
      locked: [],
      redeemed: [expect.objectContaining({ id: 'gift-redeemed' })],
      expired: []
    });
    expect(request).toHaveBeenCalledWith('/api/v1/customer/gifts', {
      method: 'GET',
      auth: 'customer'
    });
  });

  it('toggles checkout gift selection and filters selection against checkout options', async () => {
    const request = vi.fn(async () => ({
      ok: true,
      gifts: [
        createGift({ id: 'gift-1' }),
        createGift({ id: 'gift-2', giftSnapshot: { name: '肉松杯', description: '可兑换肉松杯', validDays: 180 } })
      ]
    }));

    await hydrateCheckoutGifts(request as CustomerApiRequester);

    expect(toggleCheckoutGiftSelection('gift-1')).toEqual(['gift-1']);
    expect(toggleCheckoutGiftSelection('missing-gift')).toEqual(['gift-1']);
    expect(getCheckoutGiftOptions()).toEqual([
      expect.objectContaining({ id: 'gift-1', selected: true }),
      expect.objectContaining({ id: 'gift-2', selected: false })
    ]);

    expect(toggleCheckoutGiftSelection('gift-1')).toEqual([]);
    expect(toggleCheckoutGiftSelection('gift-2')).toEqual(['gift-2']);
    expect(getSelectedCheckoutGiftSummary()).toEqual([
      expect.objectContaining({ id: 'gift-2' })
    ]);

    const refreshedRequest = vi.fn(async () => ({
      ok: true,
      gifts: [createGift({ id: 'gift-1' })]
    }));
    await hydrateCheckoutGifts(refreshedRequest as CustomerApiRequester);

    expect(getSelectedCheckoutGiftIds()).toEqual([]);
    expect(refreshedRequest).toHaveBeenCalledWith('/api/v1/customer/checkout-gifts', {
      method: 'GET',
      auth: 'customer'
    });
  });
});
