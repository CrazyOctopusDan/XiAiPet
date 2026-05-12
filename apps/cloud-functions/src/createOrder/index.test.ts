import { describe, expect, it } from 'vitest';

import type { OrderRecord } from '@xiaipet/shared';

import { main } from './index';
import type { OrderStore } from '../shared/order-store';

describe('createOrder cloud function', () => {
  const payload = {
    idempotencyKey: 'checkout-20260417-001',
    paymentMethod: 'wechat' as const,
    fulfillment: {
      mode: 'delivery' as const,
      address: {
        recipientName: '虾衣妈妈',
        phoneNumber: '13800001234',
        regionLabel: '上海市 静安区',
        detailAddress: '南京西路 1266 号 8 楼',
        tag: '家'
      },
      reservation: {
        dateValue: '2026-04-17',
        dateLabel: '今天 04-17',
        timeValue: '10:30',
        timeLabel: '10:30'
      },
      store: {
        name: '虾衣宠物烘焙工作室',
        address: '上海市静安区南京西路 1266 号 8 楼'
      }
    },
    items: [
      {
        productId: 'ocean-party',
        name: '海洋派对蛋糕',
        quantity: 2,
        unitPrice: 58,
        lineTotal: 116,
        specId: 'party-6inch',
        specLabel: '6 寸'
      }
    ],
    pets: [
      {
        id: 'pet-pudding',
        name: '布丁'
      }
    ],
    remark: '少糖',
    hasReadCustomNotice: true,
    pricing: {
      itemsSubtotal: 116,
      deliveryFee: 12,
      payableTotal: 128
    }
  };

  it('builds a frozen order snapshot and pricing breakdown from the payload', async () => {
    const repository: OrderStore = {
      getByOpenidAndIdempotencyKey: async () => null,
      save: async (order: OrderRecord) => order
    };

    const result = await main(
      {
        openid: 'user-openid',
        payload
      },
      { OPENID: 'user-openid' },
      repository
    );

    expect(result).toMatchObject({
      ok: true,
      order: {
        openid: 'user-openid',
        status: 'pending_payment',
        payment: {
          method: 'wechat',
          status: 'pending'
        },
        pricing: {
          payableTotal: 128
        },
        snapshot: {
          items: [
            expect.objectContaining({
              productId: 'ocean-party',
              lineTotal: 116
            })
          ],
          pets: [
            expect.objectContaining({
              id: 'pet-pudding'
            })
          ],
          remark: '少糖'
        }
      }
    });
  });

  it('returns the same order when the same idempotency key is replayed', async () => {
    const repository: OrderStore = {
      getByOpenidAndIdempotencyKey: async () => null,
      save: async (order: OrderRecord) => order
    };

    const first = await main(
      {
        openid: 'user-openid',
        payload
      },
      { OPENID: 'user-openid' },
      repository
    );

    const replayRepository: OrderStore = {
      getByOpenidAndIdempotencyKey: async () => first.order,
      save: async (order: OrderRecord) => order
    };

    const second = await main(
      {
        openid: 'user-openid',
        payload
      },
      { OPENID: 'user-openid' },
      replayRepository
    );

    expect(second.order.id).toBe(first.order.id);
  });

  it('rejects a conflicting payload under the same idempotency key', async () => {
    const existingOrder: OrderRecord = {
      id: 'order-20260417101010',
      openid: 'user-openid',
      status: 'pending_payment',
      paymentMethod: 'wechat',
      payment: {
        method: 'wechat',
        status: 'pending'
      },
      pricing: {
        itemsSubtotal: 116,
        deliveryFee: 12,
        payableTotal: 128
      },
      snapshot: {
        fulfillment: payload.fulfillment,
        items: payload.items,
        pets: payload.pets,
        remark: payload.remark
      },
      createdAt: '2026-04-17T10:10:10.000Z',
      updatedAt: '2026-04-17T10:10:10.000Z',
      idempotencyKey: payload.idempotencyKey
    };

    await expect(
      main(
        {
          openid: 'user-openid',
          payload: {
            ...payload,
            pricing: {
              ...payload.pricing,
              payableTotal: 999
            }
          }
        },
        { OPENID: 'user-openid' },
        {
          getByOpenidAndIdempotencyKey: async () => existingOrder,
          save: async (order: OrderRecord) => order
        } satisfies OrderStore
      )
    ).rejects.toThrow('duplicate_submit_conflict');
  });
});
