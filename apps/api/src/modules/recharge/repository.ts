import type { Prisma } from '@prisma/client';

import { getPrismaClient } from '../../db/prisma';
import { RECHARGE_TRANSACTION_STATUS } from '../../db/enums';
import type { DbClient } from '../../db/types';

export interface RechargeTransactionCreateInput {
  id: string;
  openid: string;
  planId: string;
  planSnapshot: unknown;
  paidAmount: number;
  bonusAmount: number;
  outTradeNo: string;
  idempotencyKey: string;
}

export function createRechargeRepository(client: DbClient = getPrismaClient()) {
  return {
    async findByOpenidAndIdempotencyKey(openid: string, idempotencyKey: string) {
      return client.rechargeTransaction.findUnique({
        where: {
          openid_idempotencyKey: {
            openid,
            idempotencyKey
          }
        }
      });
    },

    async findById(transactionId: string) {
      return client.rechargeTransaction.findUnique({
        where: {
          id: transactionId
        }
      });
    },

    async findByOutTradeNo(outTradeNo: string) {
      return client.rechargeTransaction.findUnique({
        where: {
          outTradeNo
        }
      });
    },

    async createPending(input: RechargeTransactionCreateInput) {
      return client.rechargeTransaction.create({
        data: {
          id: input.id,
          openid: input.openid,
          planId: input.planId,
          planSnapshot: input.planSnapshot as Prisma.InputJsonValue,
          paidAmount: input.paidAmount,
          bonusAmount: input.bonusAmount,
          status: RECHARGE_TRANSACTION_STATUS.pending,
          outTradeNo: input.outTradeNo,
          idempotencyKey: input.idempotencyKey
        }
      });
    },

    async markPaymentProcessing(id: string, input: { prepayId?: string }) {
      return client.rechargeTransaction.update({
        where: { id },
        data: {
          status: RECHARGE_TRANSACTION_STATUS.processing,
          prepayId: input.prepayId
        }
      });
    },

    async recordWechatPaymentSync(id: string, input: { transactionId?: string; paidAt?: Date }) {
      return client.rechargeTransaction.update({
        where: { id },
        data: {
          transactionId: input.transactionId,
          paidAt: input.paidAt
        }
      });
    }
  };
}
