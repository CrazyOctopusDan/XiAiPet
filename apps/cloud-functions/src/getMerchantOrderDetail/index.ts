import type { MerchantManagedOrderRecord, MerchantOrderTimelineEntry, OrderStore } from '../shared/order-store';
import { getFulfillmentStatusLabel } from '../../../../packages/shared/src/rules/order-fulfillment';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createOrderStore } from '../shared/order-store';

export interface GetMerchantOrderDetailEvent {
  orderId?: string;
  merchantUser?: unknown;
  openid?: string;
}

function sanitizeOrder(order: MerchantManagedOrderRecord) {
  const { openid: _openid, idempotencyKey: _idempotencyKey, ...safeOrder } = order;
  return safeOrder;
}

function buildFallbackTimeline(order: MerchantManagedOrderRecord): MerchantOrderTimelineEntry[] {
  const timeline: MerchantOrderTimelineEntry[] = [
    {
      type: 'created',
      label: '订单创建',
      at: order.createdAt
    }
  ];

  if (order.merchantOverride?.manualSettlement) {
    timeline.push({
      type: 'manual_settlement',
      label: '人工收款确认',
      at: order.merchantOverride.manualSettlement.settledAt,
      detail: order.merchantOverride.manualSettlement.reasonNote,
      operator: order.merchantOverride.manualSettlement.operator,
      fromStatus: order.merchantOverride.manualSettlement.before.orderStatus,
      toStatus: order.merchantOverride.manualSettlement.after.orderStatus
    });
  } else if (order.paidAt) {
    timeline.push({
      type: 'payment',
      label: '支付完成',
      at: order.paidAt
    });
  }

  if (order.fulfillmentState?.updatedAt) {
    timeline.push({
      type: 'fulfillment',
      label: getFulfillmentStatusLabel(order.fulfillmentState.mode, order.fulfillmentState.status),
      at: order.fulfillmentState.updatedAt,
      toStatus: order.fulfillmentState.status
    });
  }

  if (order.cancelledAt) {
    timeline.push({
      type: 'cancelled',
      label: '订单取消',
      at: order.cancelledAt,
      toStatus: 'cancelled'
    });
  }

  return timeline.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
}

export async function main(
  event: GetMerchantOrderDetailEvent = {},
  context?: FunctionContextLike,
  store: Pick<OrderStore, 'getById'> = createOrderStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  if (!event.orderId) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const order = (await store.getById(event.orderId)) as MerchantManagedOrderRecord | null;

  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  return {
    ok: true,
    order: sanitizeOrder(order),
    timeline: order.merchantTimeline?.length ? order.merchantTimeline : buildFallbackTimeline(order)
  };
}
