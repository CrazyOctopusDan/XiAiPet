import type { RechargePlanConfig, RechargeTransactionView } from '@xiaipet/shared';

import { customerApiRequest, type CustomerApiRequester } from './api-client';

declare const wx: any;

interface CreateRechargeTransactionResponse {
  ok?: boolean;
  transaction: RechargeTransactionView;
  paymentParams?: Record<string, unknown>;
  code?: string;
}

interface SyncRechargeTransactionResponse {
  ok?: boolean;
  transaction?: RechargeTransactionView;
  code?: string;
}

let rechargePlans: RechargePlanConfig[] = [];
let selectedRechargePlanId = '';

function cloneRechargePlan(plan: RechargePlanConfig): RechargePlanConfig {
  return {
    ...plan,
    gifts: plan.gifts.map((gift) => ({ ...gift }))
  };
}

function createRechargeIdempotencyKey() {
  return `recharge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function requestRechargePayment(paymentParams: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    if (typeof wx === 'undefined' || typeof wx.requestPayment !== 'function') {
      reject(new Error('WECHAT_PAY_UNAVAILABLE'));
      return;
    }

    wx.requestPayment({
      ...paymentParams,
      success: () => resolve(),
      fail: () => reject(new Error('WECHAT_PAY_CANCELLED'))
    });
  });
}

export async function hydrateRechargePlans(request: CustomerApiRequester = customerApiRequest) {
  const response = await request<{ ok?: boolean; plans?: RechargePlanConfig[] }>('/api/v1/customer/recharge-plans', {
    method: 'GET',
    auth: 'customer'
  });
  rechargePlans = (response.plans ?? []).map(cloneRechargePlan);

  if (!rechargePlans.some((plan) => plan.planId === selectedRechargePlanId)) {
    selectedRechargePlanId = rechargePlans[0]?.planId ?? '';
  }

  return getRechargePlans();
}

export function getRechargePlans() {
  return rechargePlans.map(cloneRechargePlan);
}

export function selectRechargePlan(planId: string) {
  if (rechargePlans.some((plan) => plan.planId === planId)) {
    selectedRechargePlanId = planId;
  }

  return getSelectedRechargePlan();
}

export function getSelectedRechargePlan() {
  return getRechargePlans().find((plan) => plan.planId === selectedRechargePlanId) ?? null;
}

export async function startRecharge(planId: string, request: CustomerApiRequester = customerApiRequest) {
  const response = await request<CreateRechargeTransactionResponse>('/api/v1/customer/recharge-transactions', {
    method: 'POST',
    auth: 'customer',
    body: {
      planId,
      idempotencyKey: createRechargeIdempotencyKey()
    }
  });

  if (!response.transaction?.id) {
    throw new Error(String(response.code ?? 'create_recharge_transaction_failed'));
  }

  if (!response.paymentParams) {
    throw new Error('missing_wechat_payment_params');
  }

  await requestRechargePayment(response.paymentParams);
  return syncRechargeTransaction(response.transaction.id, request);
}

export async function syncRechargeTransaction(
  transactionId: string,
  request: CustomerApiRequester = customerApiRequest
) {
  return request<SyncRechargeTransactionResponse>(
    `/api/v1/customer/recharge-transactions/${transactionId}/payment-sync`,
    {
      method: 'POST',
      auth: 'customer'
    }
  );
}
