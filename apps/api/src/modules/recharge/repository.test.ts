import { describe, expect, it, vi } from 'vitest';

import { RECHARGE_TRANSACTION_STATUS } from '../../db/enums';
import { createRechargeRepository } from './repository';

describe('recharge repository', () => {
  it('exports recharge transaction status enum map', () => {
    expect(RECHARGE_TRANSACTION_STATUS).toEqual({
      pending: 'PENDING',
      processing: 'PROCESSING',
      paid: 'PAID',
      failed: 'FAILED',
      cancelled: 'CANCELLED'
    });
  });

  it('finds a recharge transaction by openid and idempotency key', async () => {
    const findUnique = vi.fn(async () => null);
    const repository = createRechargeRepository({
      rechargeTransaction: {
        findUnique
      }
    } as never);

    await expect(repository.findByOpenidAndIdempotencyKey('openid-1', 'idem-1')).resolves.toBeNull();

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        openid_idempotencyKey: {
          openid: 'openid-1',
          idempotencyKey: 'idem-1'
        }
      }
    });
  });

  it('finds a recharge transaction by id and out trade number', async () => {
    const findUnique = vi.fn(async () => null);
    const repository = createRechargeRepository({
      rechargeTransaction: {
        findUnique
      }
    } as never);

    await repository.findById('recharge-1');
    await repository.findByOutTradeNo('out-trade-1');

    expect(findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'recharge-1'
      }
    });
    expect(findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        outTradeNo: 'out-trade-1'
      }
    });
  });
});
