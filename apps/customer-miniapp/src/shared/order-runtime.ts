import type {
  OrderFulfillmentMode,
  OrderFulfillmentStatus,
  OrderItemSnapshot,
  OrderItemSnapshotInput,
  OrderPricingBreakdown,
  OrderRecord
} from '@xiaipet/shared';

interface FulfillmentStepDefinition {
  status: OrderFulfillmentStatus;
  label: string;
}

const PAID_FULFILLMENT_CHAINS: Record<OrderFulfillmentMode, FulfillmentStepDefinition[]> = {
  delivery: [
    { status: 'pending', label: '待处理' },
    { status: 'in_production', label: '制作中' },
    { status: 'out_for_delivery', label: '配送中' },
    { status: 'completed', label: '已完成' }
  ],
  pickup: [
    { status: 'pending', label: '待处理' },
    { status: 'in_production', label: '制作中' },
    { status: 'ready_for_pickup', label: '待自取' },
    { status: 'completed', label: '已完成' }
  ],
  express: [
    { status: 'pending', label: '待处理' },
    { status: 'in_production', label: '制作中' },
    { status: 'ready_to_ship', label: '待发货' },
    { status: 'completed', label: '已完成' }
  ]
};

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function getDefaultFulfillmentStatus(mode: OrderFulfillmentMode) {
  return PAID_FULFILLMENT_CHAINS[mode][0].status;
}

function getFulfillmentStatusLabel(mode: OrderFulfillmentMode, status: OrderFulfillmentStatus) {
  if (status === 'cancelled') {
    return '已取消';
  }

  return PAID_FULFILLMENT_CHAINS[mode].find((item) => item.status === status)?.label ?? '状态未知';
}

export function getOrderStatusLabel(order: Pick<OrderRecord, 'status' | 'snapshot' | 'fulfillmentState'>) {
  if (order.status === 'pending_payment') {
    return '待付款';
  }

  if (order.status === 'payment_processing') {
    return '支付处理中';
  }

  if (order.status === 'payment_failed') {
    return '支付失败';
  }

  if (order.status === 'cancelled') {
    return '已取消';
  }

  const mode = order.fulfillmentState?.mode ?? order.snapshot.fulfillment.mode;
  const status = order.fulfillmentState?.status ?? getDefaultFulfillmentStatus(mode);

  return getFulfillmentStatusLabel(mode, status);
}

export function buildOrderLineSnapshot(input: OrderItemSnapshotInput): OrderItemSnapshot {
  return {
    ...input,
    lineTotal: roundCurrency(input.unitPrice * input.quantity)
  };
}

export function buildOrderPricingBreakdown(input: {
  itemsSubtotal: number;
  deliveryFee: number;
}): OrderPricingBreakdown {
  const itemsSubtotal = roundCurrency(input.itemsSubtotal);
  const deliveryFee = roundCurrency(input.deliveryFee);

  return {
    itemsSubtotal,
    deliveryFee,
    payableTotal: roundCurrency(itemsSubtotal + deliveryFee)
  };
}
