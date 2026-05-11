import type { Prisma, PrismaClient } from '@prisma/client';

import { LEDGER_TYPE } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';

export interface BalanceAdjustmentInput {
  openid: string;
  amountDelta: number;
  type: 'recharge' | 'order_payment' | 'refund' | 'manual_adjustment';
  orderId?: string;
  operatorId?: string;
  operatorName?: string;
  reason?: string;
  idempotencyKey: string;
  metadata?: unknown;
}

export interface BalanceAdjustmentResult {
  accountId: string;
  openid: string;
  balanceBefore: number;
  balanceAfter: number;
  ledgerId: string;
}

export function createBalanceService(client: PrismaClient = getPrismaClient()) {
  return {
    async adjustBalance(input: BalanceAdjustmentInput): Promise<BalanceAdjustmentResult> {
      return client.$transaction(async (tx) => {
        const account = await tx.balanceAccount.upsert({
          where: { openid: input.openid },
          update: {},
          create: {
            openid: input.openid,
            balance: 0
          }
        });

        const existing = await tx.balanceLedger.findUnique({
          where: {
            openid_idempotencyKey: {
              openid: input.openid,
              idempotencyKey: input.idempotencyKey
            }
          }
        });

        if (existing) {
          return {
            accountId: account.id,
            openid: input.openid,
            balanceBefore: existing.balanceBefore.toNumber(),
            balanceAfter: existing.balanceAfter.toNumber(),
            ledgerId: existing.id
          };
        }

        const balanceBefore = account.balance.toNumber();
        const balanceAfter = balanceBefore + input.amountDelta;
        if (balanceAfter < 0) {
          throw new Error('Insufficient balance');
        }

        const updatedAccount = await tx.balanceAccount.update({
          where: { id: account.id },
          data: {
            balance: balanceAfter,
            version: {
              increment: 1
            }
          }
        });

        const ledger = await tx.balanceLedger.create({
          data: {
            accountId: account.id,
            openid: input.openid,
            orderId: input.orderId,
            type: LEDGER_TYPE[input.type],
            amountDelta: input.amountDelta,
            balanceBefore,
            balanceAfter: updatedAccount.balance,
            operatorId: input.operatorId,
            operatorName: input.operatorName,
            reason: input.reason,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata as Prisma.InputJsonValue | undefined
          }
        });

        return {
          accountId: account.id,
          openid: input.openid,
          balanceBefore,
          balanceAfter: ledger.balanceAfter.toNumber(),
          ledgerId: ledger.id
        };
      });
    }
  };
}
