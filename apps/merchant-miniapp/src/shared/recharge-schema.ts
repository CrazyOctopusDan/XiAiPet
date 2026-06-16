export type RechargeTransactionStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
export type UserGiftStatus = 'available' | 'locked' | 'redeemed';
export type UserGiftDisplayGroup = 'available' | 'locked' | 'redeemed' | 'expired';

export interface RechargeGiftTemplate {
  giftTemplateId: string;
  name: string;
  description: string;
  validDays: number;
}

export interface RechargePlanConfig {
  planId: string;
  enabled: boolean;
  paidAmount: number;
  bonusAmount: number;
  description: string;
  gifts: RechargeGiftTemplate[];
}

export interface RechargePlansRuntimeConfigValue {
  plans: RechargePlanConfig[];
}

// Runtime-local copy of packages/shared/src/schema/recharge.ts for WeChat miniapp.
// Keep behavior aligned through src/services/recharge-config.test.ts drift coverage.
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asMoney(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.floor(numberValue * 100) / 100 : 0;
}

function asDays(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : 0;
}

function normalizeGift(value: unknown, index: number): RechargeGiftTemplate {
  if (!isRecord(value)) {
    throw new Error('INVALID_RECHARGE_GIFT');
  }
  const gift = {
    giftTemplateId: asString(value.giftTemplateId, asString(value.id, `gift-${index + 1}`)),
    name: asString(value.name),
    description: asString(value.description),
    validDays: asDays(value.validDays)
  };

  if (!gift.giftTemplateId || !gift.name || gift.validDays <= 0) {
    throw new Error('INVALID_RECHARGE_GIFT');
  }

  return gift;
}

function normalizePlan(value: unknown, index: number): RechargePlanConfig {
  if (!isRecord(value)) {
    throw new Error('INVALID_RECHARGE_PLAN');
  }
  const plan = {
    planId: asString(value.planId, asString(value.id, `plan-${index + 1}`)),
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    paidAmount: asMoney(value.paidAmount),
    bonusAmount: asMoney(value.bonusAmount),
    description: asString(value.description)
  };

  if (!plan.planId || plan.paidAmount <= 0 || plan.bonusAmount < 0) {
    throw new Error('INVALID_RECHARGE_PLAN');
  }

  return {
    ...plan,
    gifts: Array.isArray(value.gifts) ? value.gifts.map(normalizeGift) : []
  };
}

export function normalizeRechargePlansConfig(input: unknown): RechargePlansRuntimeConfigValue {
  if (!isRecord(input)) {
    return { plans: [] };
  }
  const plans = Array.isArray(input.plans) ? input.plans.map(normalizePlan) : [];
  return { plans };
}

export function summarizeUserGiftStatus(
  gift: { status: UserGiftStatus; expiresAt: string },
  now = new Date()
): UserGiftDisplayGroup {
  if (gift.status === 'redeemed') return 'redeemed';
  if (gift.status === 'locked') return 'locked';
  const expiresAt = new Date(gift.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime() ? 'expired' : 'available';
}
