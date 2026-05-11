import { describe, expect, it, vi } from 'vitest';

import type { OrderFulfillmentStatus, OrderRecord } from '@xiaipet/shared';

import type { MerchantApiRequester } from './api-client';
import {
  getMerchantOrderDetail,
  getMerchantOrderDetailViewModel,
  getMerchantOrdersPageViewModel,
  queryMerchantOrders,
  updateMerchantOrderStatus
} from './orders';

type MerchantTimelineEntry = {
  type: 'created' | 'payment' | 'manual_settlement' | 'fulfillment' | 'cancelled' | 'print';
  label: string;
  at: string;
  detail?: string;
  operator?: {
    id: string;
    name: string;
  };
  fromStatus?: string;
  toStatus?: string;
};

function createOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order-001',
    openid: 'customer-openid',
    status: 'paid',
    paymentMethod: 'wechat',
    payment: {
      method: 'wechat',
      status: 'paid'
    },
    fulfillmentState: {
      mode: 'delivery',
      status: 'pending',
      updatedAt: '2026-04-18T10:00:00.000Z'
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
          id: 'address-001',
          recipientName: '虾衣妈妈',
          phoneNumber: '13800001234',
          regionLabel: '上海市 静安区',
          detailAddress: '南京西路 1266 号 8 楼',
          tag: '家'
        },
        reservation: {
          dateValue: '2026-04-18',
          dateLabel: '今天 04-18',
          timeValue: '18:00',
          timeLabel: '18:00'
        },
        store: {
          name: '虾衣宠物烘焙工作室',
          address: '上海市静安区南京西路 1266 号 8 楼'
        }
      },
      items: [
        {
          productId: 'cake-001',
          name: '海洋派对蛋糕',
          quantity: 2,
          unitPrice: 49,
          specId: 'spec-4inch',
          specLabel: '4 寸',
          lineTotal: 98
        }
      ],
      pets: [
        {
          id: 'pet-001',
          name: '奶油'
        }
      ],
      remark: '请提前 10 分钟联系'
    },
    createdAt: '2026-04-18T09:30:00.000Z',
    updatedAt: '2026-04-18T10:00:00.000Z',
    ...overrides
  };
}

function createQueryGroup(status: OrderRecord['status'], fulfillmentStatus?: OrderFulfillmentStatus) {
  return {
    groupLabel: '待处理',
    orders: [
      createOrder({
        id: `order-${status}`,
        status,
        payment:
          status === 'paid'
            ? {
                method: 'wechat',
                status: 'paid'
              }
            : {
                method: 'wechat',
                status: 'pending'
              },
        fulfillmentState: fulfillmentStatus
          ? {
              mode: 'delivery',
              status: fulfillmentStatus,
              updatedAt: '2026-04-18T10:00:00.000Z'
            }
          : undefined,
        updatedAt: status === 'paid' ? '2026-04-18T10:00:00.000Z' : '2026-04-18T10:30:00.000Z'
      })
    ]
  };
}

describe('merchant orders service', () => {
  it('queries merchant order groups from the HTTP API', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      groups: [createQueryGroup('paid', 'pending')]
    });

    const groups = await queryMerchantOrders(request as MerchantApiRequester);

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/orders', {
      method: 'GET',
      auth: 'merchant'
    });
    expect(groups).toHaveLength(1);
  });

  it('queries merchant order detail from the HTTP API', async () => {
    const order = createOrder();
    const request = vi.fn().mockResolvedValue({
      ok: true,
      order,
      timeline: [
        {
          type: 'created',
          label: '订单创建',
          at: '2026-04-18T09:30:00.000Z'
        }
      ]
    });

    await expect(getMerchantOrderDetail('order-001', request as MerchantApiRequester)).resolves.toMatchObject({
      order: {
        id: 'order-001'
      },
      timeline: [
        expect.objectContaining({
          label: '订单创建'
        })
      ]
    });
    expect(request).toHaveBeenCalledWith('/api/v1/merchant/orders/order-001', {
      method: 'GET',
      auth: 'merchant'
    });
  });

  it('maps unpaid merchant orders into fulfillment-progress groups with a pending-payment badge', () => {
    const view = getMerchantOrdersPageViewModel([
      {
        groupLabel: '待付款',
        orders: [
          createOrder({
            id: 'order-unpaid',
            status: 'pending_payment',
            payment: {
              method: 'wechat',
              status: 'pending'
            },
            fulfillmentState: undefined,
            updatedAt: '2026-04-18T10:30:00.000Z'
          })
        ]
      },
      {
        groupLabel: '待处理',
        orders: [
          createOrder({
            id: 'order-paid',
            updatedAt: '2026-04-18T10:00:00.000Z'
          })
        ]
      }
    ]);

    expect(view.isEmpty).toBe(false);
    expect(view.groups).toHaveLength(1);
    expect(view.groups[0]).toMatchObject({
      groupLabel: '待处理',
      countLabel: '2 单'
    });
    expect(view.groups[0].orders[0]).toMatchObject({
      id: 'order-unpaid',
      statusLabel: '待处理',
      secondaryBadgeLabel: '待支付'
    });
    expect(view.groups[0].orders[1]).toMatchObject({
      id: 'order-paid',
      statusLabel: '待处理',
      secondaryBadgeLabel: null
    });
  });

  it('builds a detail view model with audit summary and mutable status options', () => {
    const detail = getMerchantOrderDetailViewModel({
      order: createOrder({
        id: 'order-unpaid',
        status: 'pending_payment',
        payment: {
          method: 'wechat',
          status: 'pending'
        },
        fulfillmentState: undefined
      }),
      timeline: [
        {
          type: 'created',
          label: '订单创建',
          at: '2026-04-18T09:30:00.000Z'
        }
      ] satisfies MerchantTimelineEntry[]
    });

    expect(detail).toMatchObject({
      id: 'order-unpaid',
      statusLabel: '待处理',
      paymentBadgeLabel: '待支付',
      actionLabel: '标记已支付/已处理',
      canUpdateStatus: true,
      canPrintReceipt: false,
      printActionLabel: '打印小票',
      receiptPrintCountLabel: '尚未打印'
    });
    expect(detail?.auditSummary).toMatchObject({
      latestActionLabel: '订单创建'
    });
    expect(detail?.statusOptions.map((item) => item.label)).toEqual(['待处理', '制作中', '配送中', '已完成', '已取消']);
  });

  it('shows receipt print metadata on paid order details', () => {
    const detail = getMerchantOrderDetailViewModel({
      order: createOrder({
        receiptPrint: {
          printCount: 2,
          lastPrintedAt: '2026-04-18T11:00:00.000Z',
          lastPrintResult: 'success',
          lastPrinterDeviceLabel: '厨房小票机',
          receiptTemplateVersion: 'receipt-v1'
        }
      }),
      timeline: [
        {
          type: 'print',
          label: '补打小票',
          at: '2026-04-18T11:00:00.000Z',
          detail: '打印机：厨房小票机'
        }
      ] satisfies MerchantTimelineEntry[]
    });

    expect(detail).toMatchObject({
      canPrintReceipt: true,
      printActionLabel: '补打小票',
      receiptPrintCountLabel: '已打印 2 次',
      receiptPrintStatusLabel: '最近打印成功 · 2026-04-18 19:00 · 厨房小票机'
    });
  });

  it('submits a merchant status update with operator identity and manual settlement metadata', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      order: createOrder({
        status: 'paid',
        fulfillmentState: {
          mode: 'delivery',
          status: 'in_production',
          updatedAt: '2026-04-18T11:00:00.000Z'
        }
      })
    });
    const verifyAccess = vi.fn().mockResolvedValue({
      ok: true,
      allowed: true,
      merchant: {
        merchantId: 'merchant-001',
        storeName: '虾衣宠物烘焙工作室'
      }
    });

    await updateMerchantOrderStatus(
      {
        order: createOrder({
          id: 'order-unpaid',
          status: 'pending_payment',
          payment: {
            method: 'wechat',
            status: 'pending'
          },
          fulfillmentState: undefined
        }),
        nextStatus: 'in_production',
        adjustmentMethod: 'manual_override',
        reasonNote: '线下已收款，继续制作'
      },
      request as MerchantApiRequester,
      verifyAccess
    );

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/orders/order-unpaid/status', {
      method: 'PATCH',
      body: {
        status: 'paid',
        paymentStatus: 'paid',
        fulfillmentStatus: 'in_production',
        adjustmentMethod: 'manual_override',
        reasonNote: '线下已收款，继续制作',
        operator: {
          id: 'merchant-001',
          name: '虾衣宠物烘焙工作室'
        }
      },
      auth: 'merchant'
    });
  });

  it('blocks status updates when merchant access is denied', async () => {
    const request = vi.fn();
    const verifyAccess = vi.fn().mockResolvedValue({
      ok: true,
      allowed: false,
      reason: '当前账号还没有商户权限'
    });

    await expect(
      updateMerchantOrderStatus(
        {
          order: createOrder(),
          nextStatus: 'in_production'
        },
        request as MerchantApiRequester,
        verifyAccess
      )
    ).rejects.toThrow('MERCHANT_FORBIDDEN');
    expect(request).not.toHaveBeenCalled();
  });
});
