import type {
  CreateOrderPayload,
  OrderItemSnapshot,
  OrderItemSnapshotInput,
  OrderPricingBreakdown
} from '../types/order';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function buildOrderLineSnapshot(input: OrderItemSnapshotInput): OrderItemSnapshot {
  return {
    ...input,
    lineTotal: Number((input.unitPrice * input.quantity).toFixed(2))
  };
}

export function buildOrderPricingBreakdown(input: {
  itemsSubtotal: number;
  deliveryFee: number;
}): OrderPricingBreakdown {
  const itemsSubtotal = Number(input.itemsSubtotal.toFixed(2));
  const deliveryFee = Number(input.deliveryFee.toFixed(2));

  return {
    itemsSubtotal,
    deliveryFee,
    payableTotal: Number((itemsSubtotal + deliveryFee).toFixed(2))
  };
}

export function isCreateOrderPayload(value: unknown): value is CreateOrderPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const fulfillment = candidate.fulfillment as Record<string, unknown> | undefined;
  const pricing = candidate.pricing as Record<string, unknown> | undefined;

  return (
    isNonEmptyString(candidate.idempotencyKey) &&
    (candidate.paymentMethod === 'wechat' || candidate.paymentMethod === 'balance') &&
    Array.isArray(candidate.items) &&
    candidate.items.length > 0 &&
    Array.isArray(candidate.pets) &&
    typeof candidate.hasReadCustomNotice === 'boolean' &&
    isNonEmptyString(candidate.remark ?? '') !== false &&
    Boolean(fulfillment) &&
    (fulfillment?.mode === 'delivery' || fulfillment?.mode === 'pickup' || fulfillment?.mode === 'express') &&
    Boolean(fulfillment?.store) &&
    Boolean(pricing) &&
    typeof pricing?.itemsSubtotal === 'number' &&
    typeof pricing?.deliveryFee === 'number' &&
    typeof pricing?.payableTotal === 'number'
  );
}
