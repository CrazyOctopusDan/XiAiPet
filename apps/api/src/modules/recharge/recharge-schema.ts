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

// Keep this API runtime-local so Docker can start from apps/api/dist without
// requiring monorepo source files. Tests compare this with the shared schema.
export function normalizeRechargePlansConfig(input: unknown): RechargePlansRuntimeConfigValue {
  if (!isRecord(input)) {
    return { plans: [] };
  }
  const plans = Array.isArray(input.plans) ? input.plans.map(normalizePlan) : [];
  return { plans };
}
