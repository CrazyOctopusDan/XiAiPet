import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/errors';
import { createRechargeService } from './service';

function date(value: string) {
  return new Date(value);
}

function decimal(value: number) {
  return { toNumber: () => value };
}

function createRuntimeSection(value: unknown) {
  return {
    id: 'recharge-plans',
    value,
    version: 1,
    updatedBy: null,
    createdAt: date('2026-06-16T10:00:00.000Z'),
    updatedAt: date('2026-06-16T10:00:00.000Z')
  };
}

function createTransactionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'recharge-openid-1_idem-1',
    openid: 'openid-1',
    planId: 'plan-100',
    planSnapshot: {
      planId: 'plan-100',
      enabled: true,
      paidAmount: 100,
      bonusAmount: 20,
      description: '充100送20',
      gifts: [],
      purchasedAt: '2026-06-16T10:00:00.000Z'
    },
    paidAmount: decimal(100),
    bonusAmount: decimal(20),
    status: 'PROCESSING',
    outTradeNo: 'recharge-openid-1_idem-1',
    prepayId: 'mock_prepay',
    transactionId: null,
    idempotencyKey: 'idem-1',
    paidAt: null,
    settledAt: null,
    createdAt: date('2026-06-16T10:00:00.000Z'),
    updatedAt: date('2026-06-16T10:00:00.000Z'),
    ...overrides
  };
}

describe('createRechargeService', () => {
  it('lists only enabled recharge plans for customers and all plans for merchants', async () => {
    const client = {
      runtimeConfigSection: {
        findMany: vi.fn(async () => [
          createRuntimeSection({
            plans: [
              { planId: 'enabled', enabled: true, paidAmount: 100, bonusAmount: 20, description: '可用', gifts: [] },
              { planId: 'disabled', enabled: false, paidAmount: 200, bonusAmount: 50, description: '停用', gifts: [] }
            ]
          })
        ])
      }
    };
    const service = createRechargeService(client as never);

    await expect(service.listCustomerRechargePlans()).resolves.toEqual([
      { planId: 'enabled', enabled: true, paidAmount: 100, bonusAmount: 20, description: '可用', gifts: [] }
    ]);
    await expect(service.listMerchantRechargePlans({ openid: 'merchant-1' })).resolves.toEqual([
      { planId: 'enabled', enabled: true, paidAmount: 100, bonusAmount: 20, description: '可用', gifts: [] },
      { planId: 'disabled', enabled: false, paidAmount: 200, bonusAmount: 50, description: '停用', gifts: [] }
    ]);
  });

  it('saves merchant recharge plans into the runtime config section', async () => {
    const upsert = vi.fn(async ({ value, updatedBy }) => ({
      ...createRuntimeSection(value),
      updatedBy
    }));
    const client = {
      runtimeConfigSection: {
        upsert
      }
    };
    const service = createRechargeService(client as never);

    const result = await service.saveMerchantRechargePlans(
      { openid: 'merchant-1' },
      {
        plans: [
          { id: 'plan-1', paidAmount: '100.239', bonusAmount: 20, description: ' recharge ', gifts: [] }
        ]
      }
    );

    expect(result.ok).toBe(true);
    expect(result.plans).toEqual([
      { planId: 'plan-1', enabled: true, paidAmount: 100.23, bonusAmount: 20, description: 'recharge', gifts: [] }
    ]);
    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'recharge-plans' },
      update: {
        value: result.section.value,
        updatedBy: 'merchant-1',
        version: { increment: 1 }
      },
      create: {
        id: 'recharge-plans',
        value: result.section.value,
        updatedBy: 'merchant-1'
      }
    });
  });

  it('creates a recharge transaction, starts payment, and reuses the idempotency key', async () => {
    const createdRow = createTransactionRow({ status: 'PENDING', prepayId: null });
    const processingRow = createTransactionRow();
    const findByIdempotency = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(processingRow);
    const update = vi.fn(async () => processingRow);
    const create = vi.fn(async () => createdRow);
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn(async () => ({
        outTradeNo: 'recharge-openid-1_idem-1',
        prepayId: 'mock_prepay',
        paymentParams: {
          timeStamp: '1700000000',
          nonceStr: 'nonce',
          package: 'prepay_id=mock_prepay',
          signType: 'RSA',
          paySign: 'sign'
        }
      })),
      syncWechatPayment: vi.fn()
    };
    const client = {
      runtimeConfigSection: {
        findMany: vi.fn(async () => [
          createRuntimeSection({
            plans: [
              { planId: 'plan-100', enabled: true, paidAmount: 100, bonusAmount: 20, description: '充100送20', gifts: [] }
            ]
          })
        ])
      },
      rechargeTransaction: {
        findUnique: findByIdempotency,
        create,
        update
      }
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    const first = await service.createCustomerRechargeTransaction('openid-1', {
      planId: 'plan-100',
      idempotencyKey: 'idem-1'
    });
    const second = await service.createCustomerRechargeTransaction('openid-1', {
      planId: 'plan-100',
      idempotencyKey: 'idem-1'
    });

    expect(first).toMatchObject({
      ok: true,
      paymentStatus: 'pending_wechat',
      transaction: {
        id: 'recharge-openid-1_idem-1',
        planId: 'plan-100',
        paidAmount: 100,
        bonusAmount: 20,
        status: 'processing'
      },
      paymentParams: {
        package: 'prepay_id=mock_prepay'
      }
    });
    expect(second).toMatchObject({
      ok: true,
      paymentStatus: 'pending_wechat_sync_required',
      transaction: {
        id: 'recharge-openid-1_idem-1',
        status: 'processing'
      }
    });
    expect(second).not.toHaveProperty('paymentParams');
    expect(create).toHaveBeenCalledTimes(1);
    expect(paymentProvider.startWechatPayment).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid or unavailable recharge transaction requests', async () => {
    const client = {
      runtimeConfigSection: {
        findMany: vi.fn(async () => [
          createRuntimeSection({
            plans: [
              { planId: 'disabled', enabled: false, paidAmount: 100, bonusAmount: 20, description: '停用', gifts: [] }
            ]
          })
        ])
      },
      rechargeTransaction: {
        findUnique: vi.fn(async () => null)
      }
    };
    const service = createRechargeService(client as never);

    await expect(service.createCustomerRechargeTransaction('openid-1', null)).rejects.toMatchObject(
      new ApiError('INVALID_RECHARGE_TRANSACTION', 'Invalid recharge transaction payload', 400)
    );
    await expect(
      service.createCustomerRechargeTransaction('openid-1', { planId: 'disabled', idempotencyKey: 'idem-1' })
    ).rejects.toMatchObject(
      new ApiError('RECHARGE_PLAN_UNAVAILABLE', 'Recharge plan is unavailable', 409)
    );
  });

  it('syncs a customer recharge payment without settling the transaction yet', async () => {
    const paidAt = date('2026-06-16T10:30:00.000Z');
    const row = createTransactionRow();
    const syncedRow = createTransactionRow({
      transactionId: 'wx-transaction-1',
      paidAt
    });
    const client = {
      rechargeTransaction: {
        findUnique: vi.fn(async () => row),
        update: vi.fn(async () => syncedRow)
      }
    };
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn(),
      syncWechatPayment: vi.fn(async () => ({
        tradeState: 'SUCCESS',
        transactionId: 'wx-transaction-1',
        paidAt
      }))
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    const result = await service.syncCustomerRechargeTransaction('openid-1', 'recharge-openid-1_idem-1');

    expect(result).toEqual({
      ok: true,
      transaction: {
        id: 'recharge-openid-1_idem-1',
        planId: 'plan-100',
        planSnapshot: row.planSnapshot,
        paidAmount: 100,
        bonusAmount: 20,
        status: 'processing',
        paidAt: '2026-06-16T10:30:00.000Z'
      }
    });
    expect(paymentProvider.syncWechatPayment).toHaveBeenCalledTimes(1);
  });

  it('blocks starting recharge payment with unsafe real providers before settlement routing exists', async () => {
    const create = vi.fn();
    const client = {
      runtimeConfigSection: {
        findMany: vi.fn(async () => [
          createRuntimeSection({
            plans: [
              { planId: 'plan-100', enabled: true, paidAmount: 100, bonusAmount: 20, description: '充100送20', gifts: [] }
            ]
          })
        ])
      },
      rechargeTransaction: {
        findUnique: vi.fn(async () => null),
        create
      }
    };
    const paymentProvider = {
      kind: 'wechat',
      startWechatPayment: vi.fn(),
      syncWechatPayment: vi.fn()
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    await expect(
      service.createCustomerRechargeTransaction('openid-1', { planId: 'plan-100', idempotencyKey: 'idem-1' })
    ).rejects.toMatchObject(
      new ApiError('RECHARGE_PAYMENT_NOT_READY', 'Recharge payment is not ready for this provider', 503)
    );
    expect(create).not.toHaveBeenCalled();
    expect(paymentProvider.startWechatPayment).not.toHaveBeenCalled();
  });

  it('re-reads an existing transaction after a concurrent idempotency unique conflict', async () => {
    const existing = createTransactionRow({ status: 'PROCESSING', prepayId: 'mock_prepay' });
    const uniqueError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    const findByIdempotency = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    const client = {
      runtimeConfigSection: {
        findMany: vi.fn(async () => [
          createRuntimeSection({
            plans: [
              { planId: 'plan-100', enabled: true, paidAmount: 100, bonusAmount: 20, description: '充100送20', gifts: [] }
            ]
          })
        ])
      },
      rechargeTransaction: {
        findUnique: findByIdempotency,
        create: vi.fn(async () => {
          throw uniqueError;
        }),
        update: vi.fn()
      }
    };
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn(),
      syncWechatPayment: vi.fn()
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    await expect(
      service.createCustomerRechargeTransaction('openid-1', { planId: 'plan-100', idempotencyKey: 'idem-1' })
    ).resolves.toMatchObject({
      ok: true,
      paymentStatus: 'pending_wechat_sync_required',
      transaction: {
        id: 'recharge-openid-1_idem-1',
        status: 'processing'
      }
    });
    expect(findByIdempotency).toHaveBeenCalledTimes(2);
    expect(paymentProvider.startWechatPayment).not.toHaveBeenCalled();
  });
});
