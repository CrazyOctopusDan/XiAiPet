import { describe, expect, it, vi } from 'vitest';

import { createBalanceService } from './balance-service';

describe('createBalanceService', () => {
  it('adjusts balance and writes a ledger in one transaction', async () => {
    const tx = {
      balanceAccount: {
        upsert: vi.fn(async () => ({ id: 'account-1', openid: 'openid-1', balance: { toNumber: () => 10 } })),
        update: vi.fn(async () => ({ id: 'account-1', balance: { toNumber: () => 25 } }))
      },
      balanceLedger: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'ledger-1', balanceAfter: { toNumber: () => 25 } }))
      }
    };
    const client = {
      $transaction: vi.fn(async (callback: (txClient: typeof tx) => unknown) => callback(tx))
    };

    const result = await createBalanceService(client as never).adjustBalance({
      openid: 'openid-1',
      amountDelta: 15,
      type: 'manual_adjustment',
      idempotencyKey: 'adjust-1'
    });

    expect(result).toMatchObject({ balanceBefore: 10, balanceAfter: 25, ledgerId: 'ledger-1' });
    expect(tx.balanceAccount.update).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { balance: 25, version: { increment: 1 } }
    });
    expect(tx.balanceLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'MANUAL_ADJUSTMENT',
          balanceBefore: 10,
          balanceAfter: expect.objectContaining({ toNumber: expect.any(Function) })
        })
      })
    );
  });
});
