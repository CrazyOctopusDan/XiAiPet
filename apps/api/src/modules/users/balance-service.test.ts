import { describe, expect, it, vi } from 'vitest';

import { createBalanceService } from './balance-service';

describe('createBalanceService', () => {
  it('adjusts balance and writes a ledger in one transaction', async () => {
    const tx = {
      balanceAccount: {
        upsert: vi.fn(async () => ({ id: 'account-1', openid: 'openid-1', balance: { toNumber: () => 10 } })),
        update: vi.fn(async () => ({ id: 'account-1', balance: { toNumber: () => 25 } })),
        findUnique: vi.fn(async () => ({ id: 'account-1', balance: { toNumber: () => 25 } }))
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
      data: { balance: { increment: 15 }, version: { increment: 1 } }
    });
    expect(tx.balanceLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'MANUAL_ADJUSTMENT',
          balanceBefore: 10,
          balanceAfter: 25
        })
      })
    );
  });

  it('uses atomic increments so sequential adjustments do not overwrite each other', async () => {
    const tx = {
      balanceAccount: {
        upsert: vi.fn(async () => ({ id: 'account-1', openid: 'openid-1', balance: { toNumber: () => 10 } })),
        update: vi.fn()
          .mockResolvedValueOnce({ id: 'account-1' })
          .mockResolvedValueOnce({ id: 'account-1' }),
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'account-1', balance: { toNumber: () => 25 } })
          .mockResolvedValueOnce({ id: 'account-1', balance: { toNumber: () => 32 } })
      },
      balanceLedger: {
        findUnique: vi.fn(async () => null),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 'ledger-1', balanceAfter: { toNumber: () => 25 } })
          .mockResolvedValueOnce({ id: 'ledger-2', balanceAfter: { toNumber: () => 32 } })
      }
    };
    const client = {
      $transaction: vi.fn(async (callback: (txClient: typeof tx) => unknown) => callback(tx))
    };
    const service = createBalanceService(client as never);

    const first = await service.adjustBalance({
      openid: 'openid-1',
      amountDelta: 15,
      type: 'recharge',
      idempotencyKey: 'recharge-1'
    });
    const second = await service.adjustBalance({
      openid: 'openid-1',
      amountDelta: 7,
      type: 'recharge',
      idempotencyKey: 'recharge-2'
    });

    expect(first).toMatchObject({ balanceBefore: 10, balanceAfter: 25 });
    expect(second).toMatchObject({ balanceBefore: 25, balanceAfter: 32 });
    expect(tx.balanceAccount.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'account-1' },
      data: { balance: { increment: 15 }, version: { increment: 1 } }
    });
    expect(tx.balanceAccount.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'account-1' },
      data: { balance: { increment: 7 }, version: { increment: 1 } }
    });
    expect(tx.balanceLedger.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({
        balanceBefore: 25,
        balanceAfter: 32
      })
    }));
  });
});
