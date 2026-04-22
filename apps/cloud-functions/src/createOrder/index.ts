import { isCreateOrderPayload, type OrderRecord } from '@xiaipet/shared';

import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createOrderStore, type OrderStore } from '../shared/order-store';

export interface CreateOrderEvent {
  payload?: unknown;
  openid?: string;
  now?: string;
}

function assertSameOrderPayload(existing: OrderRecord, nextPayload: CreateOrderEvent['payload']) {
  if (!nextPayload || typeof nextPayload !== 'object') {
    throw new Error('duplicate_submit_conflict');
  }

  const payload = nextPayload as {
    pricing: OrderRecord['pricing'];
    fulfillment: OrderRecord['snapshot']['fulfillment'];
    items: OrderRecord['snapshot']['items'];
    pets: OrderRecord['snapshot']['pets'];
    remark: string;
    paymentMethod: OrderRecord['paymentMethod'];
  };

  const existingComparable = JSON.stringify({
    pricing: existing.pricing,
    fulfillment: existing.snapshot.fulfillment,
    items: existing.snapshot.items,
    pets: existing.snapshot.pets,
    remark: existing.snapshot.remark,
    paymentMethod: existing.paymentMethod
  });
  const nextComparable = JSON.stringify({
    pricing: payload.pricing,
    fulfillment: payload.fulfillment,
    items: payload.items,
    pets: payload.pets,
    remark: payload.remark,
    paymentMethod: payload.paymentMethod
  });

  if (existingComparable !== nextComparable) {
    throw new Error('duplicate_submit_conflict');
  }
}

export async function main(event: CreateOrderEvent = {}, context?: FunctionContextLike, repository: OrderStore = createOrderStore()) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const auth = getAuthContext(event as Record<string, unknown>, context);

  if (!isCreateOrderPayload(event.payload)) {
    throw new Error('Invalid create-order payload');
  }

  const existingOrder = await repository.getByOpenidAndIdempotencyKey(auth.openid, event.payload.idempotencyKey);

  if (existingOrder) {
    assertSameOrderPayload(existingOrder, event.payload);

    return {
      ok: true,
      order: existingOrder
    };
  }

  const now = event.now ?? new Date().toISOString();
  const order: OrderRecord = {
    id: `order-${now.replace(/\D/g, '').slice(0, 14)}`,
    openid: auth.openid,
    status: 'pending_payment',
    idempotencyKey: event.payload.idempotencyKey,
    paymentMethod: event.payload.paymentMethod,
    payment: {
      method: event.payload.paymentMethod,
      status: 'pending'
    },
    pricing: event.payload.pricing,
    snapshot: {
      fulfillment: event.payload.fulfillment,
      items: event.payload.items,
      pets: event.payload.pets,
      remark: event.payload.remark
    },
    createdAt: now,
    updatedAt: now
  };

  const savedOrder = await repository.save(order);

  return {
    ok: true,
    order: savedOrder
  };
}
