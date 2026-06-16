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

  it('creates a pending recharge transaction', async () => {
    const create = vi.fn(async () => null);
    const repository = createRechargeRepository({
      rechargeTransaction: {
        create
      }
    } as never);

    await repository.createPending({
      id: 'recharge-1',
      openid: 'openid-1',
      planId: 'plan-1',
      planSnapshot: { planId: 'plan-1' },
      paidAmount: 100,
      bonusAmount: 20,
      outTradeNo: 'recharge-1',
      idempotencyKey: 'idem-1'
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        id: 'recharge-1',
        openid: 'openid-1',
        planId: 'plan-1',
        planSnapshot: { planId: 'plan-1' },
        paidAmount: 100,
        bonusAmount: 20,
        status: 'PENDING',
        outTradeNo: 'recharge-1',
        idempotencyKey: 'idem-1'
      }
    });
  });

  it('marks recharge payment processing and records WeChat sync fields', async () => {
    const update = vi.fn(async () => null);
    const paidAt = new Date('2026-06-16T10:30:00.000Z');
    const repository = createRechargeRepository({
      rechargeTransaction: {
        update
      }
    } as never);

    await repository.markPaymentProcessing('recharge-1', { prepayId: 'prepay-1' });
    await repository.recordWechatPaymentSync('recharge-1', { transactionId: 'wx-1', paidAt });

    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 'recharge-1' },
      data: {
        status: 'PROCESSING',
        prepayId: 'prepay-1'
      }
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 'recharge-1' },
      data: {
        transactionId: 'wx-1',
        paidAt
      }
    });
  });
});
