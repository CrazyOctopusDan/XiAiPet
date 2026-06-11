import { describe, expect, it, vi } from 'vitest';

import { createOrderRepository, mapOrder } from './repository';

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
      fulfillmentState: {
        mode: 'delivery',
        status: 'pending',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      pricing: {
        payableTotal: 80
      }
    });
  });
});

describe('order repository customer list filters', () => {
  it('limits customer active orders to non-terminal fulfillment states', async () => {
    const findMany = vi.fn(async () => []);
    const repository = createOrderRepository({
      order: {
        findMany
      }
    } as never);

    await repository.listByOpenid('openid-1', {
      statusGroup: 'active',
      limit: 12
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          openid: 'openid-1',
          fulfillmentStatus: {
            in: ['IN_PRODUCTION', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'READY_TO_SHIP']
          }
        }),
        take: 13,
        skip: 0
      })
    );
  });

  it('returns customer order pageInfo from the offset cursor', async () => {
    const row = {
      id: 'order-1',
      openid: 'openid-1',
      status: 'PAID',
      idempotencyKey: 'idem-1',
      paymentMethod: 'WECHAT',
      paymentStatus: 'PAID',
      fulfillmentMode: 'PICKUP',
      fulfillmentStatus: 'READY_FOR_PICKUP',
      itemsSubtotal: { toNumber: () => 1 },
      deliveryFee: { toNumber: () => 0 },
      payableTotal: { toNumber: () => 1 },
      snapshot: { fulfillment: { mode: 'pickup' }, items: [], pets: [], remark: '' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      paidAt: null,
      cancelledAt: null
    };
    const findMany = vi.fn(async () => [
      { ...row, id: 'order-1' },
      { ...row, id: 'order-2' },
      { ...row, id: 'order-3' }
    ]);
    const repository = createOrderRepository({
      order: {
        findMany
      }
    } as never);

    const page = await repository.listByOpenid('openid-1', {
      statusGroup: 'active',
      limit: 2,
      cursor: '4'
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 4, take: 3 }));
    expect(page.orders.map((order) => order.id)).toEqual(['order-1', 'order-2']);
    expect(page.pageInfo).toEqual({
      hasMore: true,
      nextCursor: '6',
      limit: 2
    });
  });
});
