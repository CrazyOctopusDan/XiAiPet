import type { Prisma, PrismaClient } from '@prisma/client';

import { LEDGER_TYPE } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

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

function runInTransaction<T>(client: DbClient, callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  const transactionalClient = client as PrismaClient;
  if (typeof transactionalClient.$transaction === 'function') {
    return transactionalClient.$transaction(callback);
  }

  return callback(client as Prisma.TransactionClient);
}

export function createBalanceService(client: DbClient = getPrismaClient()) {
  return {
    async adjustBalance(input: BalanceAdjustmentInput): Promise<BalanceAdjustmentResult> {
      return runInTransaction(client, async (tx) => {
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

        let updatedAccount: { balance: { toNumber(): number } } | null;
        if (input.amountDelta < 0) {
          const updated = await tx.balanceAccount.updateMany({
            where: {
              id: account.id,
              balance: {
                gte: Math.abs(input.amountDelta)
              }
            },
            data: {
              balance: {
                increment: input.amountDelta
              },
              version: {
                increment: 1
              }
            }
          });
          if (updated.count !== 1) {
            throw new Error('Insufficient balance');
          }
          updatedAccount = await tx.balanceAccount.findUnique({ where: { id: account.id } });
        } else {
          updatedAccount = await tx.balanceAccount.update({
            where: { id: account.id },
            data: {
              balance: {
                increment: input.amountDelta
              },
              version: {
                increment: 1
              }
            }
          });
          if (typeof tx.balanceAccount.findUnique === 'function') {
            updatedAccount = await tx.balanceAccount.findUnique({ where: { id: account.id } });
          }
        }
        if (!updatedAccount) {
          throw new Error('Balance account not found after update');
        }

        const balanceAfter = updatedAccount.balance.toNumber();
        const balanceBefore = balanceAfter - input.amountDelta;
        const ledger = await tx.balanceLedger.create({
          data: {
            accountId: account.id,
            openid: input.openid,
            orderId: input.orderId,
            type: LEDGER_TYPE[input.type],
            amountDelta: input.amountDelta,
            balanceBefore,
            balanceAfter,
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
