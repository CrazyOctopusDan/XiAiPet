import type { MerchantManagedOrderRecord, MerchantOrderTimelineEntry, OrderStore } from '../shared/order-store';
import type { OrderFulfillmentStatus, OrderManualSettlementMethod, OrderStatus } from '@xiaipet/shared';
import {
  canTransitionFulfillmentState,
  createManualSettlementRecord,
  getDefaultFulfillmentState,
  getFulfillmentStatusLabel,
  isTerminalFulfillmentStatus
} from '../../../../packages/shared/src/rules/order-fulfillment';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createOrderStore } from '../shared/order-store';

export interface UpdateMerchantOrderStatusEvent {
  orderId?: string;
  nextOrderStatus?: OrderStatus;
  nextFulfillmentStatus?: OrderFulfillmentStatus;
  adjustmentMethod?: OrderManualSettlementMethod;
  reasonNote?: string;
  operator?: {
    id: string;
    name: string;
  };
  merchantUser?: unknown;
  openid?: string;
  now?: string;
}

function isTerminalOrder(order: MerchantManagedOrderRecord) {
  return order.status === 'cancelled' || Boolean(order.fulfillmentState && isTerminalFulfillmentStatus(order.fulfillmentState.status));
}

function appendTimeline(
  order: MerchantManagedOrderRecord,
  entry: MerchantOrderTimelineEntry
): MerchantOrderTimelineEntry[] {
  return [...(order.merchantTimeline ?? []), entry];
}

function requireOperator(event: UpdateMerchantOrderStatusEvent) {
  if (!event.operator?.id || !event.operator?.name) {
    throw new Error('INVALID_MERCHANT_OPERATOR');
  }

  return event.operator;
}

export async function main(
  event: UpdateMerchantOrderStatusEvent = {},
  context?: FunctionContextLike,
  store: Pick<OrderStore, 'getById' | 'save'> = createOrderStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  if (!event.orderId) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const order = await store.getById<MerchantManagedOrderRecord>(event.orderId);

  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  if (isTerminalOrder(order)) {
    throw new Error('ORDER_TERMINAL_LOCKED');
  }

  const now = event.now ?? new Date().toISOString();
  const operator = event.operator;

  if (order.status !== 'paid' && event.nextOrderStatus === 'paid') {
    if (!event.adjustmentMethod || !event.reasonNote) {
      throw new Error('MANUAL_SETTLEMENT_REQUIRED');
    }

    const settlementOperator = requireOperator(event);
    const fulfillmentState = order.fulfillmentState ?? {
      ...getDefaultFulfillmentState(order.snapshot.fulfillment.mode),
      updatedAt: now
    };
    const fulfilledStatus = event.nextFulfillmentStatus ?? fulfillmentState.status;

    if (
      !canTransitionFulfillmentState({
        mode: fulfillmentState.mode,
        currentStatus: fulfillmentState.status,
        nextStatus: fulfilledStatus
      })
    ) {
      throw new Error('INVALID_FULFILLMENT_TRANSITION');
    }

    const nextOrder: MerchantManagedOrderRecord = {
      ...order,
      status: 'paid',
      payment: {
        method: order.payment?.method ?? order.paymentMethod,
        status: 'paid'
      },
      paidAt: now,
      updatedAt: now,
      fulfillmentState: {
        mode: fulfillmentState.mode,
        status: fulfilledStatus,
        updatedAt: now
      },
      merchantOverride: {
        ...(order.merchantOverride ?? {}),
        manualSettlement: createManualSettlementRecord({
          method: event.adjustmentMethod,
          reasonNote: event.reasonNote,
          operator: settlementOperator,
          before: {
            orderStatus: order.status,
            paymentStatus: order.payment?.status ?? 'pending'
          },
          after: {
            orderStatus: 'paid',
            paymentStatus: 'paid',
            fulfillmentStatus: fulfilledStatus
          },
          settledAt: now
        })
      }
    };

    nextOrder.merchantTimeline = appendTimeline(nextOrder, {
      type: 'manual_settlement',
      label: '人工收款确认',
      at: now,
      detail: event.reasonNote,
      operator: settlementOperator,
      fromStatus: order.status,
      toStatus: 'paid'
    });

    return {
      ok: true,
      order: await store.save(nextOrder)
    };
  }

  if (event.nextOrderStatus === 'cancelled') {
    const cancelledOrder: MerchantManagedOrderRecord = {
      ...order,
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
      fulfillmentState: order.fulfillmentState
        ? {
            ...order.fulfillmentState,
            status: 'cancelled',
            updatedAt: now
          }
        : undefined
    };

    cancelledOrder.merchantTimeline = appendTimeline(cancelledOrder, {
      type: 'cancelled',
      label: '订单取消',
      at: now,
      operator,
      fromStatus: order.status,
      toStatus: 'cancelled'
    });

    return {
      ok: true,
      order: await store.save(cancelledOrder)
    };
  }

  if (!event.nextFulfillmentStatus || order.status !== 'paid' || !order.fulfillmentState) {
    throw new Error('INVALID_STATUS_MUTATION');
  }

  if (
    !canTransitionFulfillmentState({
      mode: order.fulfillmentState.mode,
      currentStatus: order.fulfillmentState.status,
      nextStatus: event.nextFulfillmentStatus
    })
  ) {
    throw new Error('INVALID_FULFILLMENT_TRANSITION');
  }

  const updatedOrder: MerchantManagedOrderRecord = {
    ...order,
    updatedAt: now,
    fulfillmentState: {
      ...order.fulfillmentState,
      status: event.nextFulfillmentStatus,
      updatedAt: now
    }
  };

  updatedOrder.merchantTimeline = appendTimeline(updatedOrder, {
    type: 'fulfillment',
    label: getFulfillmentStatusLabel(order.fulfillmentState.mode, event.nextFulfillmentStatus),
    at: now,
    operator,
    fromStatus: order.fulfillmentState.status,
    toStatus: event.nextFulfillmentStatus
  });

  return {
    ok: true,
    order: await store.save(updatedOrder)
  };
}
