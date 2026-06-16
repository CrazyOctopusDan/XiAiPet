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

function createGiftSnapshotOrder(overrides: Record<string, unknown> = {}) {
  return createOrderRow({
    snapshot: {
      gifts: [
        {
          id: 'gift-1',
          name: '周年蛋糕',
          description: '一年内可兑换',
          validDays: 365
        }
      ]
    },
    ...overrides
  });
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

  it('locks selected gifts and stores gift snapshots when creating an order', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
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
      },
      userGift: {
        updateMany,
        findMany: vi.fn(async () => [
          {
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
            status: 'LOCKED',
            expiresAt: new Date('2026-12-31T00:00:00.000Z'),
            lockedOrderId: 'order-1',
            redeemedOrderId: null,
            lockedAt: new Date('2026-06-16T09:00:00.000Z'),
            redeemedAt: null,
            releasedAt: null,
            createdAt: new Date('2026-06-16T00:00:00.000Z'),
            updatedAt: new Date('2026-06-16T09:00:00.000Z')
          }
        ])
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
      id: 'order-1',
      idempotencyKey: 'checkout-with-gift',
      paymentMethod: 'balance',
      pricing: {
        itemsSubtotal: 133,
        deliveryFee: 0,
        payableTotal: 133
      },
      items: [],
      selectedGiftIds: [' gift-1 ', 'gift-1'],
      remark: '带赠品'
    });

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        openid: 'openid-1',
        id: { in: ['gift-1'] },
        status: 'AVAILABLE'
      }),
      data: expect.objectContaining({
        status: 'LOCKED',
        lockedOrderId: 'order-1'
      })
    }));
    expect(tx.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        snapshot: expect.objectContaining({
          selectedGiftIds: [' gift-1 ', 'gift-1'],
          gifts: [
            {
              id: 'gift-1',
              name: '周年蛋糕',
              description: '一年内可兑换',
              validDays: 365
            }
          ]
        })
      })
    }));
    expect(result.order.snapshot).toMatchObject({
      gifts: [
        {
          id: 'gift-1',
          name: '周年蛋糕'
        }
      ]
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

  it('rejects customer order ids that use reserved payment prefixes', async () => {
    const client = {
      user: {
        findUnique: vi.fn(async () => ({ phoneBindingState: 'BOUND' }))
      },
      $transaction: vi.fn()
    };
    const service = createOrderService(client as any);

    await expect(service.createCustomerOrder('openid-1', {
      id: 'recharge-order-1',
      idempotencyKey: 'checkout-key-1',
      paymentMethod: 'wechat',
      pricing: {
        itemsSubtotal: 68,
        deliveryFee: 0,
        payableTotal: 68
      },
      items: []
    })).rejects.toMatchObject({
      code: 'RESERVED_ORDER_ID',
      statusCode: 400
    });
    expect(client.$transaction).not.toHaveBeenCalled();
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
    const order = createGiftSnapshotOrder({
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
      },
      userGift: {
        updateMany: vi.fn(async () => ({ count: 1 }))
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
        paidAt: new Date('2026-05-25T08:00:00.000Z'),
        paidAmountCents: 6800
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
    expect(client.userGift.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: ['gift-1'] },
        lockedOrderId: 'order-1',
        status: 'LOCKED'
      },
      data: expect.objectContaining({
        status: 'REDEEMED',
        redeemedOrderId: 'order-1'
      })
    }));
  });

  it('redeems locked gifts after balance payment succeeds', async () => {
    const order = createGiftSnapshotOrder({
      paymentMethod: 'BALANCE',
      paymentStatus: 'PENDING',
      payableTotal: decimal(68)
    });
    const client = {
      order: {
        findUnique: vi.fn(async () => order),
        update: vi.fn(async ({ data }) =>
          createOrderRow({
            ...order,
            status: data.status,
            paymentStatus: data.paymentStatus,
            paidAt: data.paidAt
          })
        )
      },
      balanceAccount: {
        upsert: vi.fn(async () => ({ id: 'balance-1', balance: decimal(100) })),
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => ({ id: 'balance-1', balance: decimal(32) }))
      },
      balanceLedger: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'ledger-1', balanceAfter: decimal(32) }))
      },
      userGift: {
        findMany: vi.fn(async () => [{ id: 'gift-1' }]),
        updateMany: vi.fn(async () => ({ count: 1 }))
      }
    };
    const service = createOrderService(client as any);

    const result = await service.startCustomerPayment('openid-1', 'order-1');

    expect(result).toMatchObject({ ok: true, paymentStatus: 'paid' });
    expect(client.userGift.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: ['gift-1'] },
        lockedOrderId: 'order-1',
        status: 'LOCKED'
      },
      data: expect.objectContaining({
        status: 'REDEEMED',
        redeemedOrderId: 'order-1'
      })
    }));
  });

  it('releases locked gifts when balance payment has insufficient funds', async () => {
    const order = createOrderRow({
      paymentMethod: 'BALANCE',
      paymentStatus: 'PENDING',
      payableTotal: decimal(68)
    });
    const client = {
      order: {
        findUnique: vi.fn(async () => order),
        update: vi.fn(async ({ data }) =>
          createGiftSnapshotOrder({
            ...order,
            status: data.status,
            paymentStatus: data.paymentStatus,
            paidAt: data.paidAt
          })
        )
      },
      balanceAccount: {
        upsert: vi.fn(async () => ({ id: 'balance-1', balance: decimal(20) })),
        updateMany: vi.fn(async () => ({ count: 0 })),
        findUnique: vi.fn()
      },
      balanceLedger: {
        findUnique: vi.fn(async () => null),
        create: vi.fn()
      },
      userGift: {
        updateMany: vi.fn(async () => ({ count: 1 }))
      }
    };
    const service = createOrderService(client as any);

    const result = await service.startCustomerPayment('openid-1', 'order-1');

    expect(result).toMatchObject({
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      paymentStatus: 'blocked'
    });
    expect(client.userGift.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { lockedOrderId: 'order-1', status: 'LOCKED' },
      data: expect.objectContaining({
        status: 'AVAILABLE',
        lockedOrderId: null,
        lockedAt: null
      })
    }));
    expect(client.order.update).not.toHaveBeenCalled();
  });

  it('does not mark a released gift order paid on balance retry', async () => {
    const order = createGiftSnapshotOrder({
      paymentMethod: 'BALANCE',
      paymentStatus: 'PENDING',
      payableTotal: decimal(68)
    });
    const client = {
      order: {
        findUnique: vi.fn(async () => order),
        update: vi.fn(async ({ data }) =>
          createGiftSnapshotOrder({
            ...order,
            status: data.status,
            paymentStatus: data.paymentStatus,
            paidAt: data.paidAt
          })
        )
      },
      balanceAccount: {
        upsert: vi.fn(async () => ({ id: 'balance-1', balance: decimal(100) })),
        updateMany: vi.fn()
          .mockResolvedValueOnce({ count: 0 })
          .mockResolvedValueOnce({ count: 1 }),
        findUnique: vi.fn(async () => ({ id: 'balance-1', balance: decimal(32) }))
      },
      balanceLedger: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'ledger-1', balanceAfter: decimal(32) }))
      },
      userGift: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ id: 'gift-1' }])
          .mockResolvedValueOnce([]),
        updateMany: vi.fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 0 })
      }
    };
    const service = createOrderService(client as any);

    await expect(service.startCustomerPayment('openid-1', 'order-1')).resolves.toMatchObject({
      ok: false,
      code: 'INSUFFICIENT_BALANCE'
    });
    await expect(service.startCustomerPayment('openid-1', 'order-1')).rejects.toMatchObject({
      code: 'ORDER_GIFT_UNAVAILABLE',
      statusCode: 409
    });

    expect(client.order.update).not.toHaveBeenCalled();
    expect(client.balanceLedger.create).not.toHaveBeenCalled();
  });

  it('does not mark a WeChat synced order paid when promised gifts are not locked', async () => {
    const order = createGiftSnapshotOrder({
      paymentMethod: 'WECHAT',
      paymentStatus: 'PROCESSING',
      payableTotal: decimal(68)
    });
    const client = {
      order: {
        findUnique: vi.fn(async () => order),
        update: vi.fn(async ({ data }) =>
          createGiftSnapshotOrder({
            ...order,
            status: data.status,
            paymentStatus: data.paymentStatus,
            paidAt: data.paidAt
          })
        )
      },
      payment: {
        upsert: vi.fn()
      },
      userGift: {
        updateMany: vi.fn(async () => ({ count: 0 }))
      }
    };
    const paymentProvider = {
      startWechatPayment: vi.fn(),
      syncWechatPayment: vi.fn(async () => ({
        tradeState: 'SUCCESS',
        transactionId: 'wx-transaction-1',
        paidAt: new Date('2026-05-25T08:00:00.000Z'),
        paidAmountCents: 6800
      }))
    };
    const service = createOrderService(client as any, paymentProvider);

    await expect(service.syncCustomerPayment('openid-1', 'order-1')).rejects.toMatchObject({
      code: 'ORDER_GIFT_UNAVAILABLE',
      statusCode: 409
    });
    expect(client.order.update).not.toHaveBeenCalled();
  });

  it('redeems locked gifts when customer payment is confirmed manually', async () => {
    const order = createGiftSnapshotOrder({
      paymentMethod: 'WECHAT',
      paymentStatus: 'PROCESSING'
    });
    const client = {
      order: {
        findUnique: vi.fn(async () => order),
        update: vi.fn(async ({ data }) =>
          createGiftSnapshotOrder({
            ...order,
            status: data.status,
            paymentStatus: data.paymentStatus,
            paidAt: data.paidAt
          })
        )
      },
      userGift: {
        updateMany: vi.fn(async () => ({ count: 1 }))
      }
    };
    const service = createOrderService(client as any);

    const result = await service.confirmCustomerPayment('openid-1', 'order-1');

    expect(result.order).toMatchObject({
      status: 'paid',
      paymentStatus: 'paid'
    });
    expect(client.userGift.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: ['gift-1'] },
        lockedOrderId: 'order-1',
        status: 'LOCKED'
      },
      data: expect.objectContaining({
        status: 'REDEEMED',
        redeemedOrderId: 'order-1'
      })
    }));
  });

  it('rejects WeChat payment sync success when the provider omits paid amount', async () => {
    const order = createOrderRow({
      paymentMethod: 'WECHAT',
      paymentStatus: 'PROCESSING',
      payableTotal: decimal(68)
    });
    const client = {
      order: {
        findUnique: vi.fn(async () => order),
        update: vi.fn()
      },
      payment: {
        upsert: vi.fn()
      }
    };
    const paymentProvider = {
      startWechatPayment: vi.fn(),
      syncWechatPayment: vi.fn(async () => ({
        tradeState: 'SUCCESS',
        transactionId: 'wx-transaction-1',
        paidAt: new Date('2026-05-25T08:00:00.000Z')
      }))
    };
    const service = createOrderService(client as any, paymentProvider);

    await expect(service.syncCustomerPayment('openid-1', 'order-1')).rejects.toMatchObject({
      code: 'ORDER_PAYMENT_AMOUNT_MISSING',
      statusCode: 409
    });
    expect(client.payment.upsert).not.toHaveBeenCalled();
    expect(client.order.update).not.toHaveBeenCalled();
  });

  it('rejects WeChat payment sync success when the paid amount does not match the order total', async () => {
    const order = createOrderRow({
      paymentMethod: 'WECHAT',
      paymentStatus: 'PROCESSING',
      payableTotal: decimal(68)
    });
    const client = {
      order: {
        findUnique: vi.fn(async () => order),
        update: vi.fn()
      },
      payment: {
        upsert: vi.fn()
      }
    };
    const paymentProvider = {
      startWechatPayment: vi.fn(),
      syncWechatPayment: vi.fn(async () => ({
        tradeState: 'SUCCESS',
        transactionId: 'wx-transaction-1',
        paidAt: new Date('2026-05-25T08:00:00.000Z'),
        paidAmountCents: 6700
      }))
    };
    const service = createOrderService(client as any, paymentProvider);

    await expect(service.syncCustomerPayment('openid-1', 'order-1')).rejects.toMatchObject({
      code: 'ORDER_PAYMENT_AMOUNT_MISMATCH',
      statusCode: 409
    });
    expect(client.payment.upsert).not.toHaveBeenCalled();
    expect(client.order.update).not.toHaveBeenCalled();
  });

  it('lets the customer complete a ready pickup order', async () => {
    const client = {
      order: {
        findUnique: vi.fn(async () =>
          createOrderRow({
            status: 'PAID',
            paymentStatus: 'PAID',
            fulfillmentMode: 'PICKUP',
            fulfillmentStatus: 'READY_FOR_PICKUP'
          })
        ),
        update: vi.fn(async ({ data }) =>
          createOrderRow({
            status: 'PAID',
            paymentStatus: 'PAID',
            fulfillmentMode: 'PICKUP',
            fulfillmentStatus: data.fulfillmentStatus
          })
        ),
        updateMany: vi.fn()
      }
    };
    const service = createOrderService(client as any);

    const result = await service.completeCustomerOrder('openid-1', 'order-1');

    expect(client.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: expect.objectContaining({
        fulfillmentStatus: 'COMPLETED',
        merchantOverride: expect.objectContaining({
          actorType: 'customer',
          actorOpenid: 'openid-1',
          action: 'customer_confirm_completed'
        })
      })
    });
    expect(result.order).toMatchObject({
      id: 'order-1',
      fulfillmentStatus: 'completed'
    });
  });

  it('blocks customer completion before the order becomes active', async () => {
    const client = {
      order: {
        findUnique: vi.fn(async () =>
          createOrderRow({
            status: 'PAID',
            paymentStatus: 'PAID',
            fulfillmentMode: 'DELIVERY',
            fulfillmentStatus: 'PENDING'
          })
        ),
        updateMany: vi.fn()
      }
    };
    const service = createOrderService(client as any);

    await expect(service.completeCustomerOrder('openid-1', 'order-1')).rejects.toMatchObject({
      code: 'ORDER_NOT_READY_TO_COMPLETE',
      statusCode: 409
    });
  });

  it('auto-completes active paid orders that have not moved for 15 days before customer queries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T00:00:00.000Z'));
    const client = {
      order: {
        updateMany: vi.fn(async () => ({ count: 2 })),
        findMany: vi.fn(async () => [])
      }
    };
    const service = createOrderService(client as any);

    try {
      await service.queryCustomerOrders('openid-1');
    } finally {
      vi.useRealTimers();
    }

    expect(client.order.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'PAID',
        fulfillmentStatus: {
          in: ['IN_PRODUCTION', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'READY_TO_SHIP']
        },
        updatedAt: {
          lte: new Date('2026-06-05T00:00:00.000Z')
        }
      },
      data: expect.objectContaining({
        fulfillmentStatus: 'COMPLETED',
        merchantOverride: expect.objectContaining({
          actorType: 'system',
          action: 'auto_complete_active_order',
          thresholdDays: 15
        })
      })
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

  it('releases locked gifts when merchant cancels an unpaid order', async () => {
    const current = createGiftSnapshotOrder({
      paymentStatus: 'PENDING',
      status: 'PENDING_PAYMENT'
    });
    const client = {
      order: {
        updateMany: vi.fn(),
        findUnique: vi.fn(async () => current),
        update: vi.fn(async ({ data }) =>
          createGiftSnapshotOrder({
            ...current,
            ...(data.status ? { status: data.status } : {}),
            ...(data.paymentStatus ? { paymentStatus: data.paymentStatus } : {}),
            ...(data.fulfillmentStatus ? { fulfillmentStatus: data.fulfillmentStatus } : {}),
            ...(data.cancelledAt ? { cancelledAt: data.cancelledAt } : {})
          })
        )
      },
      userGift: {
        updateMany: vi.fn(async () => ({ count: 1 }))
      }
    };
    const service = createOrderService(client as any);

    await service.updateMerchantOrderStatus(
      {
        accountId: 'acct-admin',
        openid: 'merchant-openid',
        username: 'admin',
        role: 'admin',
        mustChangePassword: false,
        merchantId: 'merchant-1',
        storeName: '喜爱宠物烘焙'
      },
      'order-1',
      { status: 'cancelled' }
    );

    expect(client.userGift.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { lockedOrderId: 'order-1', status: 'LOCKED' },
      data: expect.objectContaining({
        status: 'AVAILABLE',
        lockedOrderId: null
      })
    }));
  });
});
