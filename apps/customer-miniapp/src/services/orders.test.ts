import { describe, expect, it, vi } from 'vitest';

import type { OrderRecord } from '@xiaipet/shared';

import {
  getMyOrderDetail,
  getOrderDetailViewModel,
  getOrdersPageViewModel,
  queryMyOrders
} from './orders';

function createOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order-001',
    openid: 'mock-openid',
    status: 'paid',
    paymentMethod: 'wechat',
    payment: {
      method: 'wechat',
      status: 'paid'
    },
    fulfillmentState: {
      mode: 'delivery',
      status: 'pending'
    },
    pricing: {
      itemsSubtotal: 98,
      deliveryFee: 10,
      payableTotal: 108
    },
    snapshot: {
      fulfillment: {
        mode: 'delivery',
        address: {
          id: 'address-city-home',
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
          unitPrice: 49,
          specId: 'party-4inch',
          specLabel: '4 寸',
          lineTotal: 98
        }
      ],
      pets: [
        {
          id: 'pet-1',
          name: '奶油'
        },
        {
          id: 'pet-2',
          name: '雪团'
        }
      ],
      remark: '请提前 10 分钟联系'
    },
    createdAt: '2026-04-17T09:30:00.000Z',
    updatedAt: '2026-04-17T09:35:00.000Z',
    ...overrides
  };
}

describe('orders service', () => {
  it('queries my orders from cloud function', async () => {
    const callFunction = vi.fn().mockResolvedValue({
      result: {
        ok: true,
        orders: [createOrder()]
      }
    });

    const orders = await queryMyOrders(callFunction);

    expect(callFunction).toHaveBeenCalledWith({
      name: 'queryMyOrders',
      data: {}
    });
    expect(orders).toHaveLength(1);
  });

  it('builds a sorted orders page view model from cloud records', () => {
    const view = getOrdersPageViewModel(
      [
        createOrder({
          id: 'order-older',
          createdAt: '2026-04-16T08:00:00.000Z',
          updatedAt: '2026-04-16T08:05:00.000Z'
        }),
        createOrder({
          id: 'order-newer',
          createdAt: '2026-04-17T10:00:00.000Z',
          updatedAt: '2026-04-17T10:05:00.000Z'
        })
      ],
      'order-older'
    );

    expect(view.isEmpty).toBe(false);
    expect(view.highlightedOrderId).toBe('order-older');
    expect(view.cards.map((item) => item.id)).toEqual(['order-newer', 'order-older']);
    expect(view.cards[0]).toMatchObject({
      statusLabel: '待处理',
      payableTotalLabel: '￥108.00'
    });
  });

  it('keeps customer-facing fulfillment copy aligned with the shared merchant states', () => {
    const view = getOrdersPageViewModel([
      createOrder({
        id: 'order-pickup',
        snapshot: {
          fulfillment: {
            mode: 'pickup',
            pickupPhone: '13900002222',
            reservation: {
              dateValue: '2026-04-18',
              dateLabel: '明天 04-18',
              timeValue: '16:00',
              timeLabel: '16:00'
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
              unitPrice: 49,
              specId: 'party-4inch',
              specLabel: '4 寸',
              lineTotal: 98
            }
          ],
          pets: [],
          remark: ''
        },
        fulfillmentState: {
          mode: 'pickup',
          status: 'ready_for_pickup'
        }
      })
    ]);

    expect(view.cards[0]).toMatchObject({
      statusLabel: '待自取',
      fulfillmentLabel: '到店自取'
    });
  });

  it('queries one order detail and maps the frozen snapshot fields', async () => {
    const order = createOrder();
    const callFunction = vi.fn().mockResolvedValue({
      result: {
        ok: true,
        order
      }
    });

    const detailOrder = await getMyOrderDetail('order-001', callFunction);

    expect(callFunction).toHaveBeenCalledWith({
      name: 'getMyOrderDetail',
      data: {
        orderId: 'order-001'
      }
    });
    expect(getOrderDetailViewModel(detailOrder)).toMatchObject({
      id: 'order-001',
      statusLabel: '待处理',
      fulfillmentLabel: '配送到家',
      scheduleLabel: '今天 04-17 10:30',
      addressLabel: '上海市 静安区 南京西路 1266 号 8 楼',
      contactLabel: '虾衣妈妈 13800001234',
      petNamesLabel: '奶油、雪团',
      remark: '请提前 10 分钟联系',
      paymentMethodLabel: '微信支付',
      itemsSubtotalLabel: '￥98.00',
      deliveryFeeLabel: '￥10.00',
      payableTotalLabel: '￥108.00',
      items: [
        expect.objectContaining({
          name: '海洋派对蛋糕',
          specLabel: '4 寸',
          quantityLabel: 'x2',
          lineTotalLabel: '￥98.00'
        })
      ]
    });
  });
});
