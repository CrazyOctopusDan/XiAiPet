import type { MerchantManagedOrderRecord, OrderStore } from '../shared/order-store';
import { getOrderStatusDescriptor } from '@xiaipet/shared';
import { getDefaultFulfillmentState, getFulfillmentGroupLabel } from '../../../../packages/shared/src/rules/order-fulfillment';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createOrderStore } from '../shared/order-store';

export interface QueryMerchantOrdersEvent {
  merchantUser?: unknown;
  openid?: string;
}

interface MerchantOrderListItem {
  id: string;
  status: MerchantManagedOrderRecord['status'];
  statusLabel: string;
  groupLabel: string;
  paymentMethod: MerchantManagedOrderRecord['paymentMethod'];
  paymentStatus?: MerchantManagedOrderRecord['payment']['status'];
  fulfillmentMode: MerchantManagedOrderRecord['snapshot']['fulfillment']['mode'];
  fulfillmentStatus?: MerchantManagedOrderRecord['fulfillmentState']['status'];
  pricing: MerchantManagedOrderRecord['pricing'];
  snapshot: MerchantManagedOrderRecord['snapshot'];
  createdAt: string;
  updatedAt: string;
}

function sortOrders(list: MerchantManagedOrderRecord[]) {
  return [...list].sort((left, right) => {
    const updatedAtDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

    if (updatedAtDiff !== 0) {
      return updatedAtDiff;
    }

    return right.id.localeCompare(left.id);
  });
}

function toListItem(order: MerchantManagedOrderRecord): MerchantOrderListItem {
  const descriptor = getOrderStatusDescriptor(order);
  const fallbackFulfillment = getDefaultFulfillmentState(order.snapshot.fulfillment.mode);
  const fulfillmentStatus = order.fulfillmentState?.status ?? fallbackFulfillment.status;
  const groupLabel =
    order.status === 'cancelled'
      ? descriptor.groupLabel
      : getFulfillmentGroupLabel(order.snapshot.fulfillment.mode, fulfillmentStatus);

  return {
    id: order.id,
    status: order.status,
    statusLabel: descriptor.label,
    groupLabel,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.payment?.status,
    fulfillmentMode: order.snapshot.fulfillment.mode,
    fulfillmentStatus,
    pricing: order.pricing,
    snapshot: order.snapshot,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

export async function main(
  event: QueryMerchantOrdersEvent = {},
  context?: FunctionContextLike,
  store: Pick<OrderStore, 'listMerchantOrders'> = createOrderStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  const orders = sortOrders(await store.listMerchantOrders<MerchantManagedOrderRecord>());
  const groups = orders.reduce<Array<{ groupLabel: string; orders: MerchantOrderListItem[] }>>((result, order) => {
    const item = toListItem(order);
    const group = result.find((entry) => entry.groupLabel === item.groupLabel);

    if (group) {
      group.orders.push(item);
      return result;
    }

    result.push({
      groupLabel: item.groupLabel,
      orders: [item]
    });
    return result;
  }, []);

  return {
    ok: true,
    groups
  };
}
