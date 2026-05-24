import { describe, expect, it, vi } from 'vitest';

import { createOrderService } from './service';

function decimal(value: number) {
  return { toNumber: () => value };
}

function createOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    openid: 'openid-1',
    status: 'PENDING_PAYMENT',
    idempotencyKey: 'checkout-key-1',
    paymentMethod: 'BALANCE',
    paymentStatus: 'PENDING',
    fulfillmentMode: 'DELIVERY',
    fulfillmentStatus: 'PENDING',
    itemsSubtotal: decimal(133),
    deliveryFee: decimal(0),
    payableTotal: decimal(133),
    snapshot: {},
    createdAt: new Date('2026-05-21T00:00:00.000Z'),
    updatedAt: new Date('2026-05-21T00:00:00.000Z'),
    paidAt: null,
    cancelledAt: null,
    ...overrides
  };
}

describe('order service', () => {
  it('creates customer orders from the nested checkout payload used by the miniapp', async () => {
    const tx = {
      order: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }) =>
          createOrderRow({
            id: data.id,
            openid: data.openid,
            idempotencyKey: data.idempotencyKey,
            paymentMethod: data.paymentMethod,
            fulfillmentMode: data.fulfillmentMode,
            itemsSubtotal: decimal(Number(data.itemsSubtotal)),
            deliveryFee: decimal(Number(data.deliveryFee)),
            payableTotal: decimal(Number(data.payableTotal)),
            snapshot: data.snapshot
          })
        )
      },
      product: {
        update: vi.fn()
      }
    };
    const client = {
      user: {
        findUnique: vi.fn(async () => ({ phoneBindingState: 'BOUND' }))
      },
      $transaction: vi.fn(async (callback) => callback(tx))
    };
    const service = createOrderService(client as any);

    const result = await service.createCustomerOrder('openid-1', {
      idempotencyKey: 'checkout-key-1',
      paymentMethod: 'balance',
      fulfillment: {
        mode: 'delivery',
        store: {
          name: '虾衣宠物烘焙工作室',
          address: '上海市静安区南京西路 1266 号 8 楼'
        }
      },
      pricing: {
        itemsSubtotal: 133,
        deliveryFee: 0,
        payableTotal: 133
      },
      items: [],
      pets: [],
      remark: '猫猫爱吃肉'
    });

    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          openid: 'openid-1',
          idempotencyKey: 'checkout-key-1',
          paymentMethod: 'BALANCE',
          fulfillmentMode: 'DELIVERY',
          itemsSubtotal: 133,
          deliveryFee: 0,
          payableTotal: 133
        })
      })
    );
    expect(result.order).toMatchObject({
      status: 'pending_payment',
      paymentMethod: 'balance',
      fulfillmentMode: 'delivery',
      pricing: {
        itemsSubtotal: 133,
        deliveryFee: 0,
        payableTotal: 133
      }
    });
  });

  it('rejects customer order creation before phone registration', async () => {
    const client = {
      user: {
        findUnique: vi.fn(async () => ({ phoneBindingState: 'UNBOUND' }))
      }
    };
    const service = createOrderService(client as any);

    await expect(service.createCustomerOrder('openid-new', { idempotencyKey: 'checkout-key-1' })).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_REGISTERED',
      statusCode: 403
    });
  });

  it('filters merchant orders by active/history scope and fulfillment mode', async () => {
    const client = {
      order: {
        findMany: vi.fn(async () => [
          createOrderRow({
            id: 'order-history',
            status: 'PAID',
            fulfillmentMode: 'DELIVERY',
            fulfillmentStatus: 'COMPLETED'
          })
        ])
      }
    };
    const service = createOrderService(client as any);

    const result = await service.queryMerchantOrders(
      {
        accountId: 'acct-admin',
        openid: 'merchant-openid',
        username: 'admin',
        role: 'admin',
        mustChangePassword: false,
        merchantId: 'merchant-1',
        storeName: '喜爱宠物烘焙'
      },
      {
        scope: 'history',
        fulfillmentMode: 'delivery'
      }
    );

    expect(client.order.findMany).toHaveBeenCalledWith({
      where: {
        fulfillmentStatus: 'COMPLETED',
        fulfillmentMode: 'DELIVERY'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]).toMatchObject({
      id: 'order-history',
      fulfillmentStatus: 'completed'
    });
  });
});
