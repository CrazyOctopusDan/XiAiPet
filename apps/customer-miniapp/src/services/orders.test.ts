import { describe, expect, it, vi } from 'vitest';

import type { OrderFulfillmentMode, OrderFulfillmentStatus, OrderRecord } from '@xiaipet/shared';

import type { CustomerApiRequester } from './api-client';
import {
  getOrderStatusGroup,
  getMyOrderDetail,
  getOrderDetailViewModel,
  getOrdersPageViewModel,
  getOrderStatusTabs,
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

type LegacyBackendOrderRecord = OrderRecord & {
  fulfillmentMode?: OrderFulfillmentMode;
  fulfillmentStatus?: OrderFulfillmentStatus;
};

function createLegacyPickupOrder(overrides: Partial<LegacyBackendOrderRecord> = {}): LegacyBackendOrderRecord {
  return {
    ...createOrder({
      fulfillmentState: undefined,
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
      }
    }),
    fulfillmentMode: 'pickup',
    fulfillmentStatus: 'ready_for_pickup',
    ...overrides
  };
}

describe('orders service', () => {
  it('queries my orders from the HTTP order list API', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      orders: [createOrder()]
    });

    const page = await queryMyOrders({ statusGroup: 'active', limit: 12, cursor: '20' }, request as CustomerApiRequester);

    expect(request).toHaveBeenCalledWith('/api/v1/customer/orders', {
      method: 'GET',
      auth: 'customer',
      query: {
        statusGroup: 'active',
        limit: 12,
        cursor: '20'
      }
    });
    expect(page.orders).toHaveLength(1);
    expect(page.pageInfo).toEqual({
      hasMore: false,
      nextCursor: null,
      limit: 12
    });
  });

  it('builds status tabs with counts and filters cards to the active tab', () => {
    const orders = [
      createOrder({
        id: 'order-pending',
        fulfillmentState: {
          mode: 'pickup',
          status: 'pending'
        }
      }),
      createOrder({
        id: 'order-ready',
        fulfillmentState: {
          mode: 'pickup',
          status: 'ready_for_pickup'
        }
      }),
      createOrder({
        id: 'order-completed',
        fulfillmentState: {
          mode: 'delivery',
          status: 'completed'
        }
      })
    ];

    const view = getOrdersPageViewModel(orders, null, 'active');

    expect(getOrderStatusTabs(orders).map((item) => `${item.label}:${item.count}`)).toEqual([
      '全部:3',
      '待处理:1',
      '进行中:1',
      '已完成:1'
    ]);
    expect(view.isEmpty).toBe(false);
    expect(view.cards.map((item) => item.id)).toEqual(['order-ready']);
    expect(view.cards[0]).toMatchObject({
      statusLabel: '待自取',
      statusGroup: 'active',
      statusTone: 'ready'
    });
  });

  it('classifies fulfillment states into customer-facing order groups and tones', () => {
    expect(getOrderStatusGroup(createOrder({ status: 'pending_payment' }))).toBe('pending');
    expect(getOrderStatusGroup(createOrder({ fulfillmentState: { mode: 'delivery', status: 'pending' } }))).toBe('pending');
    expect(getOrderStatusGroup(createOrder({ fulfillmentState: { mode: 'delivery', status: 'out_for_delivery' } }))).toBe('active');
    expect(getOrderStatusGroup(createOrder({ fulfillmentState: { mode: 'pickup', status: 'completed' } }))).toBe('completed');
  });

  it('normalizes backend fulfillmentStatus before building customer order list status labels', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      orders: [createLegacyPickupOrder()]
    });

    const page = await queryMyOrders(request as CustomerApiRequester);
    const view = getOrdersPageViewModel(page.orders);

    expect(page.orders[0].fulfillmentState).toMatchObject({
      mode: 'pickup',
      status: 'ready_for_pickup'
    });
    expect(view.cards[0]).toMatchObject({
      statusLabel: '待自取',
      fulfillmentLabel: '到店自取'
    });
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
    const request = vi.fn().mockResolvedValue({
      ok: true,
      order
    });

    const detailOrder = await getMyOrderDetail('order-001', request as CustomerApiRequester);

    expect(request).toHaveBeenCalledWith('/api/v1/customer/orders/order-001', {
      method: 'GET',
      auth: 'customer'
    });
    expect(getOrderDetailViewModel(detailOrder)).toMatchObject({
      id: 'order-001',
      statusLabel: '待处理',
      fulfillmentLabel: '配送到家',
      scheduleLabel: '今天 04-17 10:30',
      addressLabel: '上海市 静安区 南京西路 1266 号 8 楼',
      contactLabel: '虾衣妈妈 13800001234',
      petNamesLabel: '奶油、雪团',
      hasPets: true,
      pets: [
        {
          name: '奶油'
        },
        {
          name: '雪团'
        }
      ],
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

  it('normalizes backend fulfillmentStatus before building customer order detail status labels', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      order: createLegacyPickupOrder()
    });

    const detailOrder = await getMyOrderDetail('order-001', request as CustomerApiRequester);

    expect(getOrderDetailViewModel(detailOrder)).toMatchObject({
      statusLabel: '待自取',
      fulfillmentLabel: '到店自取'
    });
  });
});
