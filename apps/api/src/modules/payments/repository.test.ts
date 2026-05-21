import { describe, expect, it, vi } from 'vitest';

import { createPaymentRepository } from './repository';

function decimal(value: number) {
  return { toNumber: () => value };
}

describe('payment repository', () => {
  it('maps paid order rows back to the shared lowercase order shape', async () => {
    const client = {
      order: {
        update: vi.fn(async () => ({
          id: 'order-1',
          openid: 'openid-1',
          status: 'PAID',
          idempotencyKey: 'checkout-key-1',
          paymentMethod: 'BALANCE',
          paymentStatus: 'PAID',
          fulfillmentMode: 'DELIVERY',
          fulfillmentStatus: 'PENDING',
          itemsSubtotal: decimal(133),
          deliveryFee: decimal(0),
          payableTotal: decimal(133),
          snapshot: { items: [] },
          createdAt: new Date('2026-05-21T00:00:00.000Z'),
          updatedAt: new Date('2026-05-21T00:00:00.000Z'),
          paidAt: new Date('2026-05-21T00:00:01.000Z'),
          cancelledAt: null
        }))
      }
    };

    const order = await createPaymentRepository(client as any).markOrderPaid('order-1');

    expect(order).toMatchObject({
      status: 'paid',
      paymentMethod: 'balance',
      paymentStatus: 'paid',
      pricing: {
        payableTotal: 133
      }
    });
  });
});
