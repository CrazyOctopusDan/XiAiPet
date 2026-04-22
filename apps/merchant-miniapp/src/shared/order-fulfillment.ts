import type {
  OrderFulfillmentMode,
  OrderFulfillmentState,
  OrderFulfillmentStatus,
  OrderRecord
} from '@xiaipet/shared';

interface FulfillmentStepDefinition {
  status: OrderFulfillmentStatus;
  label: string;
  groupLabel: string;
}

interface FulfillmentTransitionInput {
  mode: OrderFulfillmentMode;
  currentStatus: OrderFulfillmentStatus;
  nextStatus: OrderFulfillmentStatus;
}

const PAID_FULFILLMENT_CHAINS: Record<OrderFulfillmentMode, FulfillmentStepDefinition[]> = {
  delivery: [
    { status: 'pending', label: '待处理', groupLabel: '待处理' },
    { status: 'in_production', label: '制作中', groupLabel: '制作中' },
    { status: 'out_for_delivery', label: '配送中', groupLabel: '配送中' },
    { status: 'completed', label: '已完成', groupLabel: '已完成' }
  ],
  pickup: [
    { status: 'pending', label: '待处理', groupLabel: '待处理' },
    { status: 'in_production', label: '制作中', groupLabel: '制作中' },
    { status: 'ready_for_pickup', label: '待自取', groupLabel: '待自取' },
    { status: 'completed', label: '已完成', groupLabel: '已完成' }
  ],
  express: [
    { status: 'pending', label: '待处理', groupLabel: '待处理' },
    { status: 'in_production', label: '制作中', groupLabel: '制作中' },
    { status: 'ready_to_ship', label: '待发货', groupLabel: '待发货' },
    { status: 'completed', label: '已完成', groupLabel: '已完成' }
  ]
};

const TERMINAL_FULFILLMENT_STATUSES: OrderFulfillmentStatus[] = ['completed', 'cancelled'];

function getFulfillmentStepsForMode(mode: OrderFulfillmentMode) {
  return PAID_FULFILLMENT_CHAINS[mode];
}

function getFulfillmentStep(mode: OrderFulfillmentMode, status: OrderFulfillmentStatus) {
  if (status === 'cancelled') {
    return {
      status,
      label: '已取消',
      groupLabel: '已取消'
    };
  }

  return getFulfillmentStepsForMode(mode).find((item) => item.status === status);
}

export function getPaidFulfillmentChain(mode: OrderFulfillmentMode) {
  return getFulfillmentStepsForMode(mode).map((item) => ({ ...item }));
}

export function getDefaultFulfillmentState(mode: OrderFulfillmentMode): OrderFulfillmentState {
  return {
    mode,
    status: getFulfillmentStepsForMode(mode)[0].status
  };
}

export function getFulfillmentStatusLabel(mode: OrderFulfillmentMode, status: OrderFulfillmentStatus) {
  return getFulfillmentStep(mode, status)?.label ?? '状态未知';
}

export function getFulfillmentGroupLabel(mode: OrderFulfillmentMode, status: OrderFulfillmentStatus) {
  return getFulfillmentStep(mode, status)?.groupLabel ?? '状态未知';
}

export function isTerminalFulfillmentStatus(status: OrderFulfillmentStatus) {
  return TERMINAL_FULFILLMENT_STATUSES.includes(status);
}

export function canTransitionFulfillmentState(input: FulfillmentTransitionInput) {
  const currentStep = getFulfillmentStep(input.mode, input.currentStatus);
  const nextStep = getFulfillmentStep(input.mode, input.nextStatus);

  if (!currentStep || !nextStep) {
    return false;
  }

  if (input.currentStatus === input.nextStatus) {
    return true;
  }

  return !isTerminalFulfillmentStatus(input.currentStatus);
}

export function getOrderStatusLabel(order: Pick<OrderRecord, 'status' | 'snapshot' | 'fulfillmentState'>) {
  if (order.status !== 'paid') {
    if (order.status === 'pending_payment') {
      return '待付款';
    }

    if (order.status === 'payment_processing') {
      return '支付处理中';
    }

    if (order.status === 'payment_failed') {
      return '支付失败';
    }

    return '已取消';
  }

  if (!order.fulfillmentState) {
    return '已支付';
  }

  const mode = order.fulfillmentState.mode;
  const status = order.fulfillmentState.status ?? getDefaultFulfillmentState(mode).status;

  return getFulfillmentStatusLabel(mode, status);
}
