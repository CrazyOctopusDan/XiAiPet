import { describe, expect, it } from 'vitest';

import { mapOrder } from './repository';

describe('mapOrder', () => {
  it('maps Prisma enum names and decimals to API order shape', () => {
    expect(
      mapOrder({
        id: 'order-1',
        openid: 'openid-1',
        status: 'PENDING_PAYMENT',
        idempotencyKey: 'idem-1',
        paymentMethod: 'WECHAT',
        paymentStatus: 'PENDING',
        fulfillmentMode: 'DELIVERY',
        fulfillmentStatus: 'PENDING',
        itemsSubtotal: { toNumber: () => 68 },
        deliveryFee: { toNumber: () => 12 },
        payableTotal: { toNumber: () => 80 },
        snapshot: { items: [] },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        paidAt: null,
        cancelledAt: null
      })
    ).toMatchObject({
      status: 'pending_payment',
      paymentMethod: 'wechat',
      fulfillmentMode: 'delivery',
      pricing: {
        payableTotal: 80
      }
    });
  });
});
