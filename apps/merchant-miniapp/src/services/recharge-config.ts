import {
  normalizeRechargePlansConfig,
  type RechargeGiftTemplate,
  type RechargePlanConfig,
  type RechargePlansRuntimeConfigValue
} from '../shared/recharge-schema';
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

type RechargePlansQueryResponse = { ok?: boolean; plans?: RechargePlanConfig[] } | RechargePlanConfig[];

let draftIdSequence = 0;

function createDraftId(prefix: string) {
  draftIdSequence = (draftIdSequence + 1) % Number.MAX_SAFE_INTEGER;
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${draftIdSequence.toString(36)}-${randomPart}`;
}

function validateUniqueRechargeIds(value: RechargePlansRuntimeConfigValue) {
  const planIds = new Set<string>();

  value.plans.forEach((plan) => {
    if (planIds.has(plan.planId)) {
      throw new Error('DUPLICATE_RECHARGE_PLAN_ID');
    }
    planIds.add(plan.planId);

    const giftIds = new Set<string>();
    plan.gifts.forEach((gift) => {
      if (giftIds.has(gift.giftTemplateId)) {
        throw new Error('DUPLICATE_RECHARGE_GIFT_ID');
      }
      giftIds.add(gift.giftTemplateId);
    });
  });
}

export function normalizeRechargePlansDraft(input: unknown): RechargePlansRuntimeConfigValue {
  const normalized = normalizeRechargePlansConfig(input);
  validateUniqueRechargeIds(normalized);
  return normalized;
}

export function normalizeRechargeMoneyInputText(value: string | undefined): string {
  const raw = value ?? '';
  if (raw.includes('-')) {
    return '';
  }

  const sanitized = raw.replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = sanitized.split('.');

  if (!sanitized.includes('.')) {
    return integerPart;
  }

  return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}

export function parseRechargeMoneyInput(value: string | undefined): number {
  const normalized = normalizeRechargeMoneyInputText(value);
  const numeric = Number(normalized);

  if (!normalized || !Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }

  return Math.floor(numeric * 100) / 100;
}

export function parseRechargeGiftValidDaysInput(value: string | undefined): number {
  const raw = value ?? '';
  if (raw.includes('-')) {
    return 0;
  }

  const numeric = Number(raw.replace(/[^\d]/g, ''));

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.trunc(numeric);
}

export async function queryRechargePlans(request: MerchantApiRequester = merchantApiRequest): Promise<RechargePlanConfig[]> {
  const response = await request<RechargePlansQueryResponse>('/api/v1/merchant/recharge-plans', {
    method: 'GET',
    auth: 'merchant'
  });

  return Array.isArray(response) ? response : response.plans ?? [];
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
