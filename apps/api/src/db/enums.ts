export const USER_STATUS = {
  active: 'ACTIVE',
  disabled: 'DISABLED'
} as const;

export const PHONE_BINDING_STATE = {
  unbound: 'UNBOUND',
  bound: 'BOUND'
} as const;

export const PRODUCT_STATUS = {
  draft: 'DRAFT',
  published: 'PUBLISHED',
  archived: 'ARCHIVED'
} as const;

export const PAYMENT_METHOD = {
  wechat: 'WECHAT',
  balance: 'BALANCE'
} as const;

export const ORDER_STATUS = {
  pending_payment: 'PENDING_PAYMENT',
  payment_processing: 'PAYMENT_PROCESSING',
  paid: 'PAID',
  payment_failed: 'PAYMENT_FAILED',
  cancelled: 'CANCELLED'
} as const;

export const PAYMENT_STATUS = {
  pending: 'PENDING',
  processing: 'PROCESSING',
  paid: 'PAID',
  failed: 'FAILED'
} as const;

export const FULFILLMENT_MODE = {
  delivery: 'DELIVERY',
  pickup: 'PICKUP',
  express: 'EXPRESS'
} as const;

export const FULFILLMENT_STATUS = {
  pending: 'PENDING',
  in_production: 'IN_PRODUCTION',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  ready_for_pickup: 'READY_FOR_PICKUP',
  ready_to_ship: 'READY_TO_SHIP',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED'
} as const;

export const LEDGER_TYPE = {
  recharge: 'RECHARGE',
  order_payment: 'ORDER_PAYMENT',
  refund: 'REFUND',
  manual_adjustment: 'MANUAL_ADJUSTMENT'
} as const;

export const PRINT_RESULT = {
  success: 'SUCCESS',
  failed: 'FAILED'
} as const;

export function toSharedEnum<T extends Record<string, string>>(value: string, map: T): keyof T {
  const match = Object.entries(map).find((entry) => entry[1] === value);
  if (!match) {
    throw new Error(`Unknown enum value: ${value}`);
  }

  return match[0] as keyof T;
}
