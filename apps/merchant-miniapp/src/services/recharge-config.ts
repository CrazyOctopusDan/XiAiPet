import type { RechargeGiftTemplate, RechargePlanConfig, RechargePlansRuntimeConfigValue } from '@xiaipet/shared/types/recharge';
import { merchantApiRequest, type MerchantApiRequester } from './api-client';

export interface RechargePlanRowViewModel extends RechargePlanConfig {
  summaryLabel: string;
}

export interface RechargeConfigViewModel {
  enabledCount: number;
  totalGiftCount: number;
  summaryLabel: string;
  rows: RechargePlanRowViewModel[];
}

function createDraftId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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

export function normalizeRechargePlansDraft(input: unknown): RechargePlansRuntimeConfigValue {
  if (!isRecord(input)) {
    return { plans: [] };
  }

  return {
    plans: Array.isArray(input.plans) ? input.plans.map(normalizePlan) : []
  };
}

export async function queryRechargePlans(request: MerchantApiRequester = merchantApiRequest): Promise<RechargePlanConfig[]> {
  const response = await request<{ ok?: boolean; plans?: RechargePlanConfig[] }>('/api/v1/merchant/recharge-plans', {
    method: 'GET',
    auth: 'merchant'
  });

  return response.plans ?? [];
}

export async function saveRechargePlans(
  value: RechargePlansRuntimeConfigValue,
  request: MerchantApiRequester = merchantApiRequest
): Promise<RechargePlanConfig[]> {
  const normalized = normalizeRechargePlansDraft(value);
  const response = await request<{ ok?: boolean; plans?: RechargePlanConfig[] }>('/api/v1/merchant/recharge-plans', {
    method: 'PUT',
    auth: 'merchant',
    body: normalized
  });

  return response.plans ?? normalized.plans;
}

export function buildRechargePlanDraft(): RechargePlanConfig {
  return {
    planId: createDraftId('plan'),
    enabled: true,
    paidAmount: 0,
    bonusAmount: 0,
    description: '',
    gifts: []
  };
}

export function buildRechargeGiftDraft(): RechargeGiftTemplate {
  return {
    giftTemplateId: createDraftId('gift'),
    name: '',
    description: '',
    validDays: 365
  };
}

export function getRechargeConfigViewModel(plans: RechargePlanConfig[]): RechargeConfigViewModel {
  const enabledCount = plans.filter((plan) => plan.enabled).length;
  const totalGiftCount = plans.reduce((sum, plan) => sum + plan.gifts.length, 0);

  return {
    enabledCount,
    totalGiftCount,
    summaryLabel: `${enabledCount} 个启用档位 · ${totalGiftCount} 个赠品`,
    rows: plans.map((plan) => ({
      ...plan,
      summaryLabel: `充 ${plan.paidAmount} 送 ${plan.bonusAmount} + ${plan.gifts.length} 个赠品`
    }))
  };
}
