import type { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

import { RECHARGE_TRANSACTION_STATUS, USER_GIFT_STATUS, toSharedEnum } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import { ApiError } from '../../lib/errors';
import { createMockPaymentProvider, type PaymentProvider, type WechatPaymentSubject } from '../payments/provider';
import { createRuntimeConfigRepository, type RuntimeConfigSectionRecord } from '../runtime-config/repository';
import { createBalanceService } from '../users/balance-service';
import { createRechargeRepository } from './repository';
import { normalizeRechargePlansConfig } from './recharge-schema';

const RECHARGE_PLANS_SECTION_ID = 'recharge-plans';
const RECHARGE_TRANSACTION_ID_PREFIX = 'recharge-';
const WECHAT_OUT_TRADE_NO_MAX_LENGTH = 32;

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

interface WechatRechargeSettlementPayment {
  transactionId?: string;
  paidAt?: Date;
  orderAmountCents?: number;
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

function toCents(value: number) {
  return Math.round(value * 100);
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
  const digestLength = WECHAT_OUT_TRADE_NO_MAX_LENGTH - RECHARGE_TRANSACTION_ID_PREFIX.length;
  const digest = createHash('sha256').update(`${openid}:${idempotencyKey}`).digest('hex').slice(0, digestLength);
  return `${RECHARGE_TRANSACTION_ID_PREFIX}${digest}`;
}

function createPlanSnapshot(plan: RechargePlanConfig, purchasedAt: Date): RechargePlanSnapshot {
  return {
    ...plan,
    gifts: plan.gifts.map((gift) => ({ ...gift })),
    purchasedAt: purchasedAt.toISOString()
  };
}

function createRechargePaymentSubject(transaction: RechargeTransactionRow): WechatPaymentSubject {
  const view = mapRechargeTransaction(transaction);
  return {
    id: transaction.outTradeNo,
    description: `XiAiPet 充值 ${view.paidAmount}`,
    amount: view.paidAmount
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

function canStartRechargePayment(paymentProvider: PaymentProvider) {
  return paymentProvider.kind === 'mock' || paymentProvider.supportsRechargePayments === true;
}

function assertRechargePaymentCanStart(paymentProvider: PaymentProvider) {
  if (!canStartRechargePayment(paymentProvider)) {
    throw new ApiError('RECHARGE_PAYMENT_NOT_READY', 'Recharge payment is not ready for this provider', 503);
  }
}

function isPrismaUniqueConflict(error: unknown) {
  return isRecord(error) && error.code === 'P2002';
}

function createExistingTransactionResponse(transaction: RechargeTransactionRow) {
  return {
    ok: true as const,
    paymentStatus: transaction.status === RECHARGE_TRANSACTION_STATUS.paid ? 'paid' as const : 'pending_wechat_sync_required' as const,
    transaction: mapRechargeTransaction(transaction)
  };
}

function needsRechargeTradeNumberRepair(transaction: RechargeTransactionRow) {
  return transaction.outTradeNo.length > WECHAT_OUT_TRADE_NO_MAX_LENGTH || transaction.id.length > WECHAT_OUT_TRADE_NO_MAX_LENGTH;
}

async function repairPendingRechargeTradeNumber(
  rechargeRepository: ReturnType<typeof createRechargeRepository>,
  transaction: RechargeTransactionRow,
  nextTradeNo: string
) {
  if (!needsRechargeTradeNumberRepair(transaction)) {
    return transaction;
  }

  return rechargeRepository.replacePendingTradeNumber(transaction.id, {
    id: nextTradeNo,
    outTradeNo: nextTradeNo
  }) as Promise<RechargeTransactionRow>;
}

async function startRechargePayment(
  rechargeRepository: ReturnType<typeof createRechargeRepository>,
  paymentProvider: PaymentProvider,
  transaction: RechargeTransactionRow,
  openid: string
) {
  const paymentStart = await paymentProvider.startWechatPayment(createRechargePaymentSubject(transaction), { openid });
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
        if (existing.status === RECHARGE_TRANSACTION_STATUS.pending) {
          assertRechargePaymentCanStart(paymentProvider);
          const pending = await repairPendingRechargeTradeNumber(
            rechargeRepository,
            existing as RechargeTransactionRow,
            createRechargeTransactionId(openid, input.idempotencyKey)
          );
          const payment = await startRechargePayment(rechargeRepository, paymentProvider, pending, openid);
          return {
            ok: true as const,
            paymentStatus: 'pending_wechat' as const,
            transaction: mapRechargeTransaction(payment.transaction),
            paymentParams: payment.paymentParams
          };
        }
        return createExistingTransactionResponse(existing as RechargeTransactionRow);
      }

      const plans = await listRechargePlans(client);
      const plan = plans.find((candidate) => candidate.planId === input.planId && candidate.enabled);
      if (!plan) {
        throw new ApiError('RECHARGE_PLAN_UNAVAILABLE', 'Recharge plan is unavailable', 409);
      }

      const id = createRechargeTransactionId(openid, input.idempotencyKey);
      const purchasedAt = new Date();
      assertRechargePaymentCanStart(paymentProvider);
      let created: unknown;
      try {
        created = await rechargeRepository.createPending({
          id,
          openid,
          planId: plan.planId,
          planSnapshot: createPlanSnapshot(plan, purchasedAt),
          paidAmount: plan.paidAmount,
          bonusAmount: plan.bonusAmount,
          outTradeNo: id,
          idempotencyKey: input.idempotencyKey
        });
      } catch (error) {
        if (!isPrismaUniqueConflict(error)) {
          throw error;
        }
        const concurrent = await rechargeRepository.findByOpenidAndIdempotencyKey(openid, input.idempotencyKey);
        if (!concurrent) {
          throw error;
        }
        return createExistingTransactionResponse(concurrent as RechargeTransactionRow);
      }
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

      const syncedPayment = await paymentProvider.syncWechatPayment(createRechargePaymentSubject(transaction as RechargeTransactionRow), { openid });
      let current = transaction as RechargeTransactionRow;
      if (syncedPayment.tradeState === 'SUCCESS') {
        const settled = await this.settleWechatRechargePayment((transaction as RechargeTransactionRow).outTradeNo, {
          transactionId: syncedPayment.transactionId,
          paidAt: syncedPayment.paidAt ?? new Date(),
          orderAmountCents: syncedPayment.orderAmountCents
        });
        return {
          ok: true as const,
          transaction: settled
        };
      }

      return {
        ok: true as const,
        transaction: mapRechargeTransaction(current)
      };
    },

    async settleWechatRechargePayment(outTradeNo: string, payment: WechatRechargeSettlementPayment) {
      return client.$transaction(async (tx) => {
        const existing = await tx.rechargeTransaction.findUnique({
          where: { outTradeNo }
        }) as RechargeTransactionRow | null;
        if (!existing) {
          throw new ApiError('RECHARGE_TRANSACTION_NOT_FOUND', 'Recharge transaction not found', 404);
        }

        if (payment.orderAmountCents === undefined) {
          throw new ApiError('RECHARGE_PAYMENT_AMOUNT_MISSING', 'Recharge payment amount is required for settlement', 409);
        }
        if (payment.orderAmountCents !== toCents(toNumber(existing.paidAmount))) {
          throw new ApiError('RECHARGE_PAYMENT_AMOUNT_MISMATCH', 'Recharge payment amount does not match transaction amount', 409);
        }
        if (existing.settledAt) {
          return mapRechargeTransaction(existing);
        }

        const paidAt = payment.paidAt ?? new Date();
        const claim = await tx.rechargeTransaction.updateMany({
          where: {
            id: existing.id,
            settledAt: null
          },
          data: {
            status: RECHARGE_TRANSACTION_STATUS.paid,
            transactionId: payment.transactionId,
            paidAt,
            settledAt: paidAt
          }
        });
        if (claim.count !== 1) {
          const settled = await tx.rechargeTransaction.findUnique({
            where: { id: existing.id }
          }) as RechargeTransactionRow | null;
          if (settled?.settledAt) {
            return mapRechargeTransaction(settled);
          }
          throw new ApiError('RECHARGE_SETTLEMENT_CONFLICT', 'Recharge settlement could not be claimed', 409);
        }
        const updated = {
          ...existing,
          status: RECHARGE_TRANSACTION_STATUS.paid,
          transactionId: payment.transactionId ?? existing.transactionId,
          paidAt,
          settledAt: paidAt
        };

        await createBalanceService(tx as never).adjustBalance({
          openid: existing.openid,
          amountDelta: toNumber(existing.paidAmount),
          type: 'recharge',
          idempotencyKey: `recharge-paid-${existing.id}`,
          reason: '充值到账',
          metadata: { rechargeTransactionId: existing.id, amountKind: 'paid', planId: existing.planId }
        });

        const bonusAmount = toNumber(existing.bonusAmount);
        if (bonusAmount > 0) {
          await createBalanceService(tx as never).adjustBalance({
            openid: existing.openid,
            amountDelta: bonusAmount,
            type: 'recharge',
            idempotencyKey: `recharge-bonus-${existing.id}`,
            reason: '充值赠送',
            metadata: { rechargeTransactionId: existing.id, amountKind: 'bonus', planId: existing.planId }
          });
        }

        const planSnapshot = existing.planSnapshot as RechargePlanSnapshot;
        const gifts = Array.isArray(planSnapshot.gifts) ? planSnapshot.gifts : [];
        if (gifts.length > 0) {
          const existingGifts = await tx.userGift.findMany({
            where: {
              sourceRechargeTransactionId: existing.id
            },
            select: {
              giftTemplateId: true
            }
          });
          const existingGiftTemplateIds = new Set(existingGifts.map((gift) => gift.giftTemplateId));

          for (const gift of gifts) {
            if (existingGiftTemplateIds.has(gift.giftTemplateId)) {
              continue;
            }
            await tx.userGift.create({
              data: {
                openid: existing.openid,
                sourceRechargeTransactionId: existing.id,
                sourcePlanId: planSnapshot.planId ?? existing.planId,
                giftTemplateId: gift.giftTemplateId,
                giftSnapshot: {
                  giftTemplateId: gift.giftTemplateId,
                  name: gift.name,
                  description: gift.description,
                  validDays: gift.validDays
                } as Prisma.InputJsonValue,
                status: USER_GIFT_STATUS.available,
                expiresAt: new Date(paidAt.getTime() + gift.validDays * 24 * 60 * 60 * 1000)
              }
            });
          }
        }

        return mapRechargeTransaction(updated);
      });
    }
  };
}
