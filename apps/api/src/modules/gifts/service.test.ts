import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGiftService } from './service';

function createGiftRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-06-16T00:00:00.000Z');
  return {
    id: 'gift-1',
    openid: 'openid-1',
    sourceRechargeTransactionId: 'recharge-tx-1',
    sourcePlanId: 'plan-1',
    giftTemplateId: 'cake-year',
    giftSnapshot: {
      name: '周年蛋糕',
      description: '一年内可兑换',
      validDays: 365
    },
    status: 'AVAILABLE',
    expiresAt: new Date('2026-12-31T00:00:00.000Z'),
    lockedOrderId: null,
    redeemedOrderId: null,
    lockedAt: null,
    redeemedAt: null,
    releasedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('gift service', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups expired available gifts as expired for my gifts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T09:00:00.000Z'));
    const client = {
      userGift: {
        findMany: vi.fn(async () => [
          createGiftRow({ id: 'gift-available', expiresAt: new Date('2026-06-17T00:00:00.000Z') }),
          createGiftRow({ id: 'gift-expired', expiresAt: new Date('2026-06-16T09:00:00.000Z') }),
          createGiftRow({ id: 'gift-locked', status: 'LOCKED', lockedOrderId: 'order-1' }),
          createGiftRow({ id: 'gift-redeemed', status: 'REDEEMED', redeemedOrderId: 'order-2' })
        ])
      }
    };

    await expect(createGiftService(client as never).listCustomerGifts('openid-1')).resolves.toMatchObject({
      ok: true,
      gifts: [
        expect.objectContaining({ id: 'gift-available', displayGroup: 'available' }),
        expect.objectContaining({ id: 'gift-expired', displayGroup: 'expired' }),
        expect.objectContaining({ id: 'gift-locked', displayGroup: 'locked' }),
        expect.objectContaining({ id: 'gift-redeemed', displayGroup: 'redeemed' })
      ],
      groups: {
        available: [expect.objectContaining({ id: 'gift-available' })],
        locked: [expect.objectContaining({ id: 'gift-locked' })],
        redeemed: [expect.objectContaining({ id: 'gift-redeemed' })],
        expired: [expect.objectContaining({ id: 'gift-expired' })]
      }
    });
  });

  it('lists checkout gifts as available and unexpired only', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T09:00:00.000Z'));
    const findMany = vi.fn(async () => [createGiftRow({ id: 'gift-checkout' })]);
    const client = {
      userGift: {
        findMany
      }
    };

    const result = await createGiftService(client as never).listCheckoutGifts('openid-1');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        openid: 'openid-1',
        status: 'AVAILABLE',
        expiresAt: { gt: new Date('2026-06-16T09:00:00.000Z') }
      })
    }));
    expect(result).toMatchObject({
      ok: true,
      gifts: [expect.objectContaining({ id: 'gift-checkout', displayGroup: 'available' })]
    });
  });

  it('locks selected gifts atomically for order creation and dedupes ids', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T09:00:00.000Z'));
    const updateMany = vi.fn(async () => ({ count: 2 }));
    const findMany = vi.fn(async () => [
      createGiftRow({ id: 'gift-1', status: 'LOCKED', lockedOrderId: 'order-1' }),
      createGiftRow({ id: 'gift-2', status: 'LOCKED', lockedOrderId: 'order-1' })
    ]);
    const client = {
      userGift: {
        updateMany,
        findMany
      }
    };

    await expect(createGiftService(client as never).lockGiftsForOrder('openid-1', 'order-1', [' gift-1 ', 'gift-1', 'gift-2'])).resolves.toEqual([
      expect.objectContaining({ id: 'gift-1', giftSnapshot: expect.objectContaining({ name: '周年蛋糕' }) }),
      expect.objectContaining({ id: 'gift-2', giftSnapshot: expect.objectContaining({ name: '周年蛋糕' }) })
    ]);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        openid: 'openid-1',
        id: { in: ['gift-1', 'gift-2'] },
        status: 'AVAILABLE',
        expiresAt: { gt: new Date('2026-06-16T09:00:00.000Z') }
      },
      data: expect.objectContaining({
        status: 'LOCKED',
        lockedOrderId: 'order-1',
        redeemedOrderId: null,
        redeemedAt: null
      })
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        openid: 'openid-1',
        id: { in: ['gift-1', 'gift-2'] },
        lockedOrderId: 'order-1',
        status: 'LOCKED'
      }
    }));
  });

  it('throws when any selected gift is unavailable or expired', async () => {
    const client = {
      userGift: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        findMany: vi.fn()
      }
    };

    await expect(createGiftService(client as never).lockGiftsForOrder('openid-1', 'order-1', ['gift-expired'])).rejects.toMatchObject({
      code: 'GIFT_UNAVAILABLE',
      statusCode: 409
    });
    expect(client.userGift.findMany).not.toHaveBeenCalled();
  });

  it('redeems and releases locked gifts for an order', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const client = {
      userGift: {
        updateMany
      }
    };
    const service = createGiftService(client as never);

    await expect(service.redeemGiftsForOrder('order-1')).resolves.toEqual({ ok: true, count: 1 });
    await expect(service.releaseGiftsForOrder('order-1')).resolves.toEqual({ ok: true, count: 1 });

    expect(updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { lockedOrderId: 'order-1', status: 'LOCKED' },
      data: expect.objectContaining({
        status: 'REDEEMED',
        redeemedOrderId: 'order-1'
      })
    }));
    expect(updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { lockedOrderId: 'order-1', status: 'LOCKED' },
      data: expect.objectContaining({
        status: 'AVAILABLE',
        lockedOrderId: null,
        lockedAt: null
      })
    }));
  });
});
