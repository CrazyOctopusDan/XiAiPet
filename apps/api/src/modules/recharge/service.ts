import type { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

import { RECHARGE_TRANSACTION_STATUS, toSharedEnum } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import { ApiError } from '../../lib/errors';
import type { OrderRecord } from '../orders/repository';
import { createMockPaymentProvider, type PaymentProvider, type WechatPaymentSyncResult } from '../payments/provider';
import { createRuntimeConfigRepository, type RuntimeConfigSectionRecord } from '../runtime-config/repository';
import { createRechargeRepository } from './repository';

const { normalizeRechargePlansConfig } = require('../../../../../packages/shared/src/schema/recharge.js') as {
  normalizeRechargePlansConfig(input: unknown): RechargePlansRuntimeConfigValue;
};

const RECHARGE_PLANS_SECTION_ID = 'recharge-plans';

interface RechargeGiftTemplate {
  giftTemplateId: string;
  name: string;
  description: string;
  validDays: number;
}

interface RechargePlanConfig {
  planId: string;
  enabled: boolean;
  paidAmount: number;
  bonusAmount: number;
  description: string;
  gifts: RechargeGiftTemplate[];
}

interface RechargePlansRuntimeConfigValue {
  plans: RechargePlanConfig[];
}

interface RechargePlanSnapshot extends RechargePlanConfig {
  purchasedAt: string;
}

interface RechargeTransactionView {
  id: string;
  planId: string;
  planSnapshot: RechargePlanSnapshot;
  paidAmount: number;
  bonusAmount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  paidAt?: string;
  settledAt?: string;
}

interface MerchantContext {
  openid?: string;
}

interface RechargeTransactionRow {
  id: string;
  openid: string;
  planId: string;
  planSnapshot: unknown;
  paidAmount: number | { toNumber(): number };
  bonusAmount: number | { toNumber(): number };
  status: string;
  outTradeNo: string;
  prepayId: string | null;
  transactionId: string | null;
  idempotencyKey: string;
  paidAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readCreateTransactionPayload(payload: unknown) {
  if (!isRecord(payload)) {
    throw new ApiError('INVALID_RECHARGE_TRANSACTION', 'Invalid recharge transaction payload', 400);
  }
  const planId = asNonEmptyString(payload.planId);
  const idempotencyKey = asNonEmptyString(payload.idempotencyKey);
  if (!planId || !idempotencyKey) {
    throw new ApiError('INVALID_RECHARGE_TRANSACTION', 'Invalid recharge transaction payload', 400);
  }
  return { planId, idempotencyKey };
}

function toNumber(value: number | { toNumber(): number }) {
  return typeof value === 'number' ? value : value.toNumber();
}

function mapRechargeTransaction(row: RechargeTransactionRow): RechargeTransactionView {
  return {
    id: row.id,
    planId: row.planId,
    planSnapshot: row.planSnapshot as RechargePlanSnapshot,
    paidAmount: toNumber(row.paidAmount),
    bonusAmount: toNumber(row.bonusAmount),
    status: toSharedEnum(row.status, RECHARGE_TRANSACTION_STATUS),
    paidAt: row.paidAt?.toISOString(),
    settledAt: row.settledAt?.toISOString()
  };
}

function createRechargeTransactionId(openid: string, idempotencyKey: string) {
  const raw = `${openid}_${idempotencyKey}`.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 150);
  if (raw) {
    return `recharge_${raw}`;
  }
  const digest = createHash('sha256').update(`${openid}:${idempotencyKey}`).digest('hex').slice(0, 32);
  return `recharge_${digest}`;
}

function createPlanSnapshot(plan: RechargePlanConfig, purchasedAt: Date): RechargePlanSnapshot {
  return {
    ...plan,
    gifts: plan.gifts.map((gift) => ({ ...gift })),
    purchasedAt: purchasedAt.toISOString()
  };
}

function createPaymentOrderShape(transaction: RechargeTransactionRow): OrderRecord {
  const view = mapRechargeTransaction(transaction);
  return {
    id: transaction.outTradeNo,
    openid: transaction.openid,
    status: 'payment_processing',
    idempotencyKey: transaction.idempotencyKey,
    paymentMethod: 'wechat',
    paymentStatus: 'processing',
    fulfillmentMode: 'pickup',
    pricing: {
      itemsSubtotal: view.paidAmount,
      deliveryFee: 0,
      payableTotal: view.paidAmount
    },
    snapshot: {
      type: 'recharge',
      plan: view.planSnapshot
    },
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    paidAt: view.paidAt
  };
}

async function listRechargePlans(client: PrismaClient) {
  const [section] = await createRuntimeConfigRepository(client as never).listSections([RECHARGE_PLANS_SECTION_ID]);
  return normalizeRechargePlansConfig(section?.value).plans;
}

function mapSectionWithNormalizedPlans(section: RuntimeConfigSectionRecord, plans: RechargePlanConfig[]) {
  return {
    ...section,
    value: {
      plans
    }
  };
}

async function startRechargePayment(
  rechargeRepository: ReturnType<typeof createRechargeRepository>,
  paymentProvider: PaymentProvider,
  transaction: RechargeTransactionRow,
  openid: string
) {
  const paymentStart = await paymentProvider.startWechatPayment(createPaymentOrderShape(transaction), { openid });
  const processing = await rechargeRepository.markPaymentProcessing(transaction.id, {
    prepayId: paymentStart.prepayId
  });

  return {
    transaction: processing as RechargeTransactionRow,
    paymentParams: paymentStart.paymentParams
  };
}

export function createRechargeService(
  client: PrismaClient = getPrismaClient(),
  paymentProvider: PaymentProvider = createMockPaymentProvider()
) {
  return {
    async listCustomerRechargePlans() {
      const plans = await listRechargePlans(client);
      return plans.filter((plan) => plan.enabled);
    },

    async listMerchantRechargePlans(_merchantContext: MerchantContext) {
      return listRechargePlans(client);
    },

    async saveMerchantRechargePlans(merchantContext: MerchantContext, payload: unknown) {
      const value = normalizeRechargePlansConfig(payload);
      const section = await createRuntimeConfigRepository(client as never).upsertSection({
        sectionId: RECHARGE_PLANS_SECTION_ID,
        value,
        updatedBy: merchantContext.openid
      });
      return {
        ok: true as const,
        section: mapSectionWithNormalizedPlans(section, value.plans),
        plans: value.plans
      };
    },

    async createCustomerRechargeTransaction(openid: string, payload: unknown) {
      const input = readCreateTransactionPayload(payload);
      const rechargeRepository = createRechargeRepository(client as never);
      const existing = await rechargeRepository.findByOpenidAndIdempotencyKey(openid, input.idempotencyKey);
      if (existing) {
        if (existing.status === RECHARGE_TRANSACTION_STATUS.paid) {
          return {
            ok: true as const,
            paymentStatus: 'paid' as const,
            transaction: mapRechargeTransaction(existing as RechargeTransactionRow)
          };
        }
        const payment = await startRechargePayment(rechargeRepository, paymentProvider, existing as RechargeTransactionRow, openid);
        return {
          ok: true as const,
          paymentStatus: 'pending_wechat' as const,
          transaction: mapRechargeTransaction(payment.transaction),
          paymentParams: payment.paymentParams
        };
      }

      const plans = await listRechargePlans(client);
      const plan = plans.find((candidate) => candidate.planId === input.planId && candidate.enabled);
      if (!plan) {
        throw new ApiError('RECHARGE_PLAN_UNAVAILABLE', 'Recharge plan is unavailable', 409);
      }

      const id = createRechargeTransactionId(openid, input.idempotencyKey);
      const purchasedAt = new Date();
      const created = await rechargeRepository.createPending({
        id,
        openid,
        planId: plan.planId,
        planSnapshot: createPlanSnapshot(plan, purchasedAt),
        paidAmount: plan.paidAmount,
        bonusAmount: plan.bonusAmount,
        outTradeNo: id,
        idempotencyKey: input.idempotencyKey
      });
      const payment = await startRechargePayment(rechargeRepository, paymentProvider, created as RechargeTransactionRow, openid);

      return {
        ok: true as const,
        paymentStatus: 'pending_wechat' as const,
        transaction: mapRechargeTransaction(payment.transaction),
        paymentParams: payment.paymentParams
      };
    },

    async syncCustomerRechargeTransaction(openid: string, transactionId: string) {
      const rechargeRepository = createRechargeRepository(client as never);
      const transaction = await rechargeRepository.findById(transactionId);
      if (!transaction || transaction.openid !== openid) {
        throw new ApiError('RECHARGE_TRANSACTION_NOT_FOUND', 'Recharge transaction not found', 404);
      }

      const syncedPayment = await paymentProvider.syncWechatPayment(createPaymentOrderShape(transaction as RechargeTransactionRow), { openid });
      let current = transaction as RechargeTransactionRow;
      if (syncedPayment.tradeState === 'SUCCESS') {
        current = await rechargeRepository.recordWechatPaymentSync(transaction.id, {
          transactionId: syncedPayment.transactionId,
          paidAt: syncedPayment.paidAt ?? new Date()
        }) as RechargeTransactionRow;
      }

      return {
        ok: true as const,
        transaction: mapRechargeTransaction(current)
      };
    },

    async settleWechatRechargePayment(_outTradeNo: string, _payment: WechatPaymentSyncResult) {
      throw new ApiError('RECHARGE_SETTLEMENT_NOT_IMPLEMENTED', 'Recharge settlement is not implemented yet', 501);
    }
  };
}
