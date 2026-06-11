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

  it('rejects delivery customer orders below the configured minimum order amount', async () => {
    const client = {
      user: {
        findUnique: vi.fn(async () => ({ phoneBindingState: 'BOUND' }))
      },
      runtimeConfigSection: {
        findMany: vi.fn(async () => [
          {
            id: 'delivery-rules',
            value: {
              tiers: [
                {
                  distanceKm: 5,
                  minimumOrderAmount: 98,
                  deliveryFee: 0,
                  explainer: '5.0 公里内 98 元起送，配送费 0 元'
                }
              ]
            },
            version: 1,
            updatedBy: null,
            createdAt: new Date('2026-05-21T00:00:00.000Z'),
            updatedAt: new Date('2026-05-21T00:00:00.000Z')
          }
        ])
      },
      $transaction: vi.fn()
    };
    const service = createOrderService(client as any);

    await expect(service.createCustomerOrder('openid-1', {
      idempotencyKey: 'checkout-below-minimum',
      paymentMethod: 'balance',
      fulfillment: {
        mode: 'delivery',
        address: {
          id: 'addr-1',
          recipientName: '奶油',
          phoneNumber: '13900001111',
          regionLabel: '上海市 黄浦区',
          detailAddress: '外滩 18 号 201',
          tag: '公司'
        }
      },
      pricing: {
        itemsSubtotal: 22.8,
        deliveryFee: 0,
        payableTotal: 22.8
      },
      items: []
    })).rejects.toMatchObject({
      code: 'DELIVERY_MINIMUM_NOT_MET',
      statusCode: 409
    });
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('rejects delivery customer orders outside the configured delivery distance tiers', async () => {
    const client = {
      user: {
        findUnique: vi.fn(async () => ({ phoneBindingState: 'BOUND' }))
      },
      runtimeConfigSection: {
        findMany: vi.fn(async () => [
          {
            id: 'delivery-rules',
            value: {
              tiers: [
                {
                  distanceKm: 50,
                  minimumOrderAmount: null,
                  deliveryFee: 80,
                  explainer: '50.0 公里内，配送费 80 元'
                }
              ]
            },
            version: 1,
            updatedBy: null,
            createdAt: new Date('2026-05-21T00:00:00.000Z'),
            updatedAt: new Date('2026-05-21T00:00:00.000Z')
          },
          {
            id: 'store-profile',
            value: {
              storeName: '喜爱宠物烘焙',
              address: '上海市静安区南京西路 1266 号',
              latitude: 31.22911,
              longitude: 121.44853
            },
            version: 1,
            updatedBy: null,
            createdAt: new Date('2026-05-21T00:00:00.000Z'),
            updatedAt: new Date('2026-05-21T00:00:00.000Z')
          }
        ])
      },
      $transaction: vi.fn()
    };
    const service = createOrderService(client as any);

    await expect(service.createCustomerOrder('openid-1', {
      idempotencyKey: 'checkout-out-of-range',
      paymentMethod: 'balance',
      fulfillment: {
        mode: 'delivery',
        address: {
          id: 'addr-1',
          recipientName: '奶油',
          phoneNumber: '13900001111',
          regionLabel: '浙江省 杭州市',
          detailAddress: '文三路 90 号',
          tag: '家',
          latitude: 30.2767,
          longitude: 120.1258
        }
      },
      pricing: {
        itemsSubtotal: 168,
        deliveryFee: 80,
        payableTotal: 248
      },
      items: []
    })).rejects.toMatchObject({
      code: 'DELIVERY_OUT_OF_RANGE',
      statusCode: 409
    });
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('records WeChat prepay metadata and marks the order paid after provider sync succeeds', async () => {
    const order = createOrderRow({
      paymentMethod: 'WECHAT',
      paymentStatus: 'PENDING',
      payableTotal: decimal(68)
    });
    const client = {
      order: {
        findUnique: vi.fn(async () => order),
        update: vi.fn(async ({ data }) =>
          createOrderRow({
            ...order,
            status: data.status ?? 'PAYMENT_PROCESSING',
            paymentStatus: data.paymentStatus ?? 'PROCESSING',
            paidAt: data.paidAt ?? null
          })
        )
      },
      payment: {
        upsert: vi.fn(async ({ create, update }) => ({ ...create, ...update }))
      }
    };
    const paymentProvider = {
      startWechatPayment: vi.fn(async () => ({
        prepayId: 'wx-prepay-1',
        outTradeNo: 'order-1',
        paymentParams: {
          timeStamp: '1700000000',
          nonceStr: 'nonce-1',
          package: 'prepay_id=wx-prepay-1',
          signType: 'RSA',
          paySign: 'pay-sign-1'
        }
      })),
      syncWechatPayment: vi.fn(async () => ({
        tradeState: 'SUCCESS',
        transactionId: 'wx-transaction-1',
        paidAt: new Date('2026-05-25T08:00:00.000Z')
      }))
    };
    const service = createOrderService(client as any, paymentProvider);

    const started = await service.startCustomerPayment('openid-1', 'order-1');
    const synced = await service.syncCustomerPayment('openid-1', 'order-1');

    expect(started).toMatchObject({
      ok: true,
      paymentStatus: 'pending_wechat',
      paymentParams: {
        package: 'prepay_id=wx-prepay-1'
      }
    });
    expect(client.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        orderId: 'order-1',
        method: 'WECHAT',
        status: 'PROCESSING',
        outTradeNo: 'order-1',
        prepayId: 'wx-prepay-1'
      })
    }));
    expect(synced).toMatchObject({
      ok: true,
      order: {
        status: 'paid',
        paymentStatus: 'paid'
      }
    });
    expect(paymentProvider.syncWechatPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'order-1'
      }),
      { openid: 'openid-1' }
    );
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
