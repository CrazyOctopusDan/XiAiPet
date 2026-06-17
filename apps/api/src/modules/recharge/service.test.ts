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

function createPaymentStart(prepayId = 'mock_prepay') {
  return {
    outTradeNo: 'recharge-openid-1_idem-1',
    prepayId,
    paymentParams: {
      timeStamp: '1700000000',
      nonceStr: 'nonce',
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: 'sign'
    }
  };
}

function createSettlementClient(options: {
  transaction?: ReturnType<typeof createTransactionRow> | null;
  updatedTransaction?: ReturnType<typeof createTransactionRow>;
  existingGifts?: Array<{ giftTemplateId: string }>;
} = {}) {
  const paidAt = date('2026-06-16T10:30:00.000Z');
  const transaction = options.transaction === undefined
    ? createTransactionRow({
      planSnapshot: {
        planId: 'plan-100',
        enabled: true,
        paidAmount: 100,
        bonusAmount: 20,
        description: '充100送20',
        gifts: [
          { giftTemplateId: 'gift-cookie', name: '饼干券', description: '宠物饼干一份', validDays: 30 },
          { giftTemplateId: 'gift-cake', name: '蛋糕券', description: '生日蛋糕折扣', validDays: 7 }
        ],
        purchasedAt: '2026-06-16T10:00:00.000Z'
      }
    })
    : options.transaction;
  const updatedTransaction = options.updatedTransaction ?? createTransactionRow({
    ...(transaction ?? {}),
    status: 'PAID',
    transactionId: 'wx-transaction-1',
    paidAt,
    settledAt: paidAt
  });
  const tx = {
    rechargeTransaction: {
      findUnique: vi.fn(async () => transaction),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => updatedTransaction)
    },
    balanceAccount: {
      upsert: vi.fn(async () => ({ id: 'balance-account-1', openid: 'openid-1', balance: decimal(0) })),
      update: vi.fn()
        .mockResolvedValueOnce({ id: 'balance-account-1', balance: decimal(100) })
        .mockResolvedValueOnce({ id: 'balance-account-1', balance: decimal(120) })
    },
    balanceLedger: {
      findUnique: vi.fn(async () => null),
      create: vi.fn()
        .mockResolvedValueOnce({ id: 'ledger-paid', balanceAfter: decimal(100) })
        .mockResolvedValueOnce({ id: 'ledger-bonus', balanceAfter: decimal(120) })
    },
    userGift: {
      findMany: vi.fn(async () => options.existingGifts ?? []),
      create: vi.fn(async ({ data }: { data: unknown }) => data)
    }
  };
  const client = {
    $transaction: vi.fn(async (callback: (txClient: typeof tx) => unknown) => callback(tx))
  };

  return { client, tx, paidAt, transaction, updatedTransaction };
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
      startWechatPayment: vi.fn(async () => createPaymentStart()),
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

  it('creates WeChat-compatible recharge trade numbers from long customer keys', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => createTransactionRow({
      ...data,
      status: 'PENDING',
      prepayId: null
    }));
    const update = vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => createTransactionRow({
      id: where.id,
      outTradeNo: where.id,
      status: data.status,
      prepayId: data.prepayId
    }));
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn(async () => createPaymentStart()),
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
        findUnique: vi.fn(async () => null),
        create,
        update
      }
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    await service.createCustomerRechargeTransaction('o7UpF6WkVeryLongCustomerOpenid', {
      planId: 'plan-100',
      idempotencyKey: 'recharge-page-1781684004957-cash01'
    });

    const createdData = create.mock.calls[0]?.[0].data;
    expect(createdData.id).toMatch(/^recharge-[a-f0-9]+$/);
    expect(createdData.id).toHaveLength(32);
    expect(createdData.outTradeNo).toBe(createdData.id);
    expect(paymentProvider.startWechatPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: createdData.id
      }),
      { openid: 'o7UpF6WkVeryLongCustomerOpenid' }
    );
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

  it('syncs a customer recharge payment and settles successful WeChat payments', async () => {
    const paidAt = date('2026-06-16T10:30:00.000Z');
    const row = createTransactionRow();
    const paidRow = createTransactionRow({
      status: 'PAID',
      transactionId: 'wx-transaction-1',
      paidAt,
      settledAt: paidAt
    });
    const { tx } = createSettlementClient({ transaction: row, updatedTransaction: paidRow });
    const client = {
      $transaction: vi.fn(async (callback: (txClient: typeof tx) => unknown) => callback(tx)),
      rechargeTransaction: {
        findUnique: vi.fn(async () => row)
      }
    };
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn(),
      syncWechatPayment: vi.fn(async () => ({
        tradeState: 'SUCCESS',
        transactionId: 'wx-transaction-1',
        paidAt,
        paidAmountCents: 10000
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
        status: 'paid',
        paidAt: '2026-06-16T10:30:00.000Z',
        settledAt: '2026-06-16T10:30:00.000Z'
      }
    });
    expect(paymentProvider.syncWechatPayment).toHaveBeenCalledTimes(1);
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.balanceLedger.create).toHaveBeenCalledTimes(2);
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

  it('recovers an existing pending transaction by retrying payment start with the same out trade number', async () => {
    const pendingRow = createTransactionRow({ status: 'PENDING', prepayId: null });
    const processingRow = createTransactionRow();
    const update = vi.fn(async () => processingRow);
    const client = {
      rechargeTransaction: {
        findUnique: vi.fn(async () => pendingRow),
        update
      }
    };
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn(async () => createPaymentStart()),
      syncWechatPayment: vi.fn()
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    const result = await service.createCustomerRechargeTransaction('openid-1', {
      planId: 'plan-100',
      idempotencyKey: 'idem-1'
    });

    expect(result).toMatchObject({
      ok: true,
      paymentStatus: 'pending_wechat',
      transaction: {
        id: 'recharge-openid-1_idem-1',
        status: 'processing'
      },
      paymentParams: {
        package: 'prepay_id=mock_prepay'
      }
    });
    expect(paymentProvider.startWechatPayment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'recharge-openid-1_idem-1' }),
      { openid: 'openid-1' }
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: 'recharge-openid-1_idem-1' },
      data: {
        status: 'PROCESSING',
        prepayId: 'mock_prepay'
      }
    });
  });

  it('repairs an existing pending recharge with an overlong trade number before retrying payment start', async () => {
    const legacyTradeNo = 'recharge-o7UpF6WkVeryLongCustomerOpenid_recharge-page-1781684004957-cash01';
    const pendingRow = createTransactionRow({
      id: legacyTradeNo,
      outTradeNo: legacyTradeNo,
      openid: 'o7UpF6WkVeryLongCustomerOpenid',
      status: 'PENDING',
      prepayId: null,
      idempotencyKey: 'recharge-page-1781684004957-cash01'
    });
    let repairedTradeNo = '';
    const update = vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      if (typeof data.id === 'string' && typeof data.outTradeNo === 'string') {
        repairedTradeNo = data.id;
        return createTransactionRow({
          ...pendingRow,
          id: data.id,
          outTradeNo: data.outTradeNo
        });
      }
      return createTransactionRow({
        ...pendingRow,
        id: where.id,
        outTradeNo: where.id,
        status: data.status,
        prepayId: data.prepayId
      });
    });
    const client = {
      rechargeTransaction: {
        findUnique: vi.fn(async () => pendingRow),
        update
      }
    };
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn(async () => createPaymentStart()),
      syncWechatPayment: vi.fn()
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    await service.createCustomerRechargeTransaction('o7UpF6WkVeryLongCustomerOpenid', {
      planId: 'plan-100',
      idempotencyKey: 'recharge-page-1781684004957-cash01'
    });

    expect(repairedTradeNo).toMatch(/^recharge-[a-f0-9]+$/);
    expect(repairedTradeNo).toHaveLength(32);
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: legacyTradeNo },
      data: {
        id: repairedTradeNo,
        outTradeNo: repairedTradeNo
      }
    });
    expect(paymentProvider.startWechatPayment).toHaveBeenCalledWith(
      expect.objectContaining({ id: repairedTradeNo }),
      { openid: 'o7UpF6WkVeryLongCustomerOpenid' }
    );
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: repairedTradeNo },
      data: {
        status: 'PROCESSING',
        prepayId: 'mock_prepay'
      }
    });
  });

  it('does not strand a pending transaction when the first payment processing update fails', async () => {
    const createdRow = createTransactionRow({ status: 'PENDING', prepayId: null });
    const processingRow = createTransactionRow();
    const update = vi.fn()
      .mockRejectedValueOnce(new Error('db update failed'))
      .mockResolvedValueOnce(processingRow);
    const findByIdempotency = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdRow);
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
        create: vi.fn(async () => createdRow),
        update
      }
    };
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn(async () => createPaymentStart()),
      syncWechatPayment: vi.fn()
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    await expect(
      service.createCustomerRechargeTransaction('openid-1', { planId: 'plan-100', idempotencyKey: 'idem-1' })
    ).rejects.toThrow('db update failed');
    await expect(
      service.createCustomerRechargeTransaction('openid-1', { planId: 'plan-100', idempotencyKey: 'idem-1' })
    ).resolves.toMatchObject({
      ok: true,
      paymentStatus: 'pending_wechat',
      transaction: {
        id: 'recharge-openid-1_idem-1',
        status: 'processing'
      },
      paymentParams: {
        package: 'prepay_id=mock_prepay'
      }
    });
    expect(paymentProvider.startWechatPayment).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('does not strand a pending transaction when the first provider start fails after creation', async () => {
    const createdRow = createTransactionRow({ status: 'PENDING', prepayId: null });
    const processingRow = createTransactionRow();
    const findByIdempotency = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdRow);
    const update = vi.fn(async () => processingRow);
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
        create: vi.fn(async () => createdRow),
        update
      }
    };
    const paymentProvider = {
      kind: 'mock',
      startWechatPayment: vi.fn()
        .mockRejectedValueOnce(new Error('provider failed'))
        .mockResolvedValueOnce(createPaymentStart()),
      syncWechatPayment: vi.fn()
    };
    const service = createRechargeService(client as never, paymentProvider as never);

    await expect(
      service.createCustomerRechargeTransaction('openid-1', { planId: 'plan-100', idempotencyKey: 'idem-1' })
    ).rejects.toThrow('provider failed');
    await expect(
      service.createCustomerRechargeTransaction('openid-1', { planId: 'plan-100', idempotencyKey: 'idem-1' })
    ).resolves.toMatchObject({
      ok: true,
      paymentStatus: 'pending_wechat',
      transaction: {
        id: 'recharge-openid-1_idem-1',
        status: 'processing'
      },
      paymentParams: {
        package: 'prepay_id=mock_prepay'
      }
    });
    expect(paymentProvider.startWechatPayment).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('settles a WeChat recharge payment with paid and bonus ledgers and gift snapshots', async () => {
    const { client, tx, paidAt } = createSettlementClient();
    const service = createRechargeService(client as never);

    await expect(
      service.settleWechatRechargePayment('recharge-openid-1_idem-1', {
        transactionId: 'wx-transaction-1',
        paidAt,
        paidAmountCents: 10000
      })
    ).resolves.toMatchObject({
      id: 'recharge-openid-1_idem-1',
      status: 'paid',
      paidAt: '2026-06-16T10:30:00.000Z',
      settledAt: '2026-06-16T10:30:00.000Z'
    });

    expect(tx.rechargeTransaction.findUnique).toHaveBeenCalledWith({
      where: { outTradeNo: 'recharge-openid-1_idem-1' }
    });
    expect(tx.rechargeTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'recharge-openid-1_idem-1', settledAt: null },
      data: {
        status: 'PAID',
        transactionId: 'wx-transaction-1',
        paidAt,
        settledAt: paidAt
      }
    });
    expect(tx.balanceLedger.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({
        amountDelta: 100,
        idempotencyKey: 'recharge-paid-recharge-openid-1_idem-1',
        reason: '充值到账',
        type: 'RECHARGE'
      })
    }));
    expect(tx.balanceLedger.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({
        amountDelta: 20,
        idempotencyKey: 'recharge-bonus-recharge-openid-1_idem-1',
        reason: '充值赠送',
        type: 'RECHARGE'
      })
    }));
    expect(tx.userGift.create).toHaveBeenCalledTimes(2);
    expect(tx.userGift.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        openid: 'openid-1',
        sourceRechargeTransactionId: 'recharge-openid-1_idem-1',
        sourcePlanId: 'plan-100',
        giftTemplateId: 'gift-cookie',
        status: 'AVAILABLE',
        giftSnapshot: {
          giftTemplateId: 'gift-cookie',
          name: '饼干券',
          description: '宠物饼干一份',
          validDays: 30
        },
        expiresAt: date('2026-07-16T10:30:00.000Z')
      })
    });
    expect(tx.userGift.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        giftTemplateId: 'gift-cake',
        expiresAt: date('2026-06-23T10:30:00.000Z')
      })
    });
  });

  it('does not duplicate ledgers or gifts when settlement is repeated', async () => {
    const paidAt = date('2026-06-16T10:30:00.000Z');
    const unsettled = createTransactionRow({
      planSnapshot: {
        planId: 'plan-100',
        enabled: true,
        paidAmount: 100,
        bonusAmount: 20,
        description: '充100送20',
        gifts: [
          { giftTemplateId: 'gift-cookie', name: '饼干券', description: '宠物饼干一份', validDays: 30 }
        ],
        purchasedAt: '2026-06-16T10:00:00.000Z'
      }
    });
    const settled = createTransactionRow({
      ...unsettled,
      status: 'PAID',
      transactionId: 'wx-transaction-1',
      paidAt,
      settledAt: paidAt
    });
    const { client, tx } = createSettlementClient({ transaction: unsettled, updatedTransaction: settled });
    tx.rechargeTransaction.findUnique
      .mockResolvedValueOnce(unsettled)
      .mockResolvedValueOnce(settled);
    const service = createRechargeService(client as never);

    await service.settleWechatRechargePayment('recharge-openid-1_idem-1', {
      transactionId: 'wx-transaction-1',
      paidAt,
      paidAmountCents: 10000
    });
    await service.settleWechatRechargePayment('recharge-openid-1_idem-1', {
      transactionId: 'wx-transaction-1',
      paidAt,
      paidAmountCents: 10000
    });

    expect(tx.rechargeTransaction.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.rechargeTransaction.update).not.toHaveBeenCalled();
    expect(tx.balanceLedger.create).toHaveBeenCalledTimes(2);
    expect(tx.userGift.create).toHaveBeenCalledTimes(1);
  });

  it('returns RECHARGE_TRANSACTION_NOT_FOUND when settling a missing out trade number', async () => {
    const { client } = createSettlementClient({ transaction: null });
    const service = createRechargeService(client as never);

    await expect(
      service.settleWechatRechargePayment('recharge-missing', {
        transactionId: 'wx-transaction-1',
        paidAt: date('2026-06-16T10:30:00.000Z'),
        paidAmountCents: 10000
      })
    ).rejects.toMatchObject(
      new ApiError('RECHARGE_TRANSACTION_NOT_FOUND', 'Recharge transaction not found', 404)
    );
  });

  it('rejects recharge settlement when paid amount is missing', async () => {
    const { client, tx, paidAt } = createSettlementClient();
    const service = createRechargeService(client as never);

    await expect(
      service.settleWechatRechargePayment('recharge-openid-1_idem-1', {
        transactionId: 'wx-transaction-1',
        paidAt
      })
    ).rejects.toMatchObject(
      new ApiError('RECHARGE_PAYMENT_AMOUNT_MISSING', 'Recharge payment amount is required for settlement', 409)
    );
    expect(tx.rechargeTransaction.updateMany).not.toHaveBeenCalled();
    expect(tx.rechargeTransaction.update).not.toHaveBeenCalled();
    expect(tx.balanceLedger.create).not.toHaveBeenCalled();
    expect(tx.userGift.create).not.toHaveBeenCalled();
  });

  it('returns an already settled transaction without side effects when a duplicate settlement loses the claim', async () => {
    const paidAt = date('2026-06-16T10:30:00.000Z');
    const unsettled = createTransactionRow();
    const settled = createTransactionRow({
      ...unsettled,
      status: 'PAID',
      transactionId: 'wx-transaction-1',
      paidAt,
      settledAt: paidAt
    });
    const { client, tx } = createSettlementClient({ transaction: unsettled, updatedTransaction: settled });
    tx.rechargeTransaction.updateMany.mockResolvedValueOnce({ count: 0 });
    tx.rechargeTransaction.findUnique
      .mockResolvedValueOnce(unsettled)
      .mockResolvedValueOnce(settled);
    const service = createRechargeService(client as never);

    await expect(
      service.settleWechatRechargePayment('recharge-openid-1_idem-1', {
        transactionId: 'wx-transaction-1',
        paidAt,
        paidAmountCents: 10000
      })
    ).resolves.toMatchObject({
      id: 'recharge-openid-1_idem-1',
      status: 'paid',
      settledAt: '2026-06-16T10:30:00.000Z'
    });

    expect(tx.rechargeTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'recharge-openid-1_idem-1', settledAt: null },
      data: {
        status: 'PAID',
        transactionId: 'wx-transaction-1',
        paidAt,
        settledAt: paidAt
      }
    });
    expect(tx.rechargeTransaction.update).not.toHaveBeenCalled();
    expect(tx.balanceLedger.create).not.toHaveBeenCalled();
    expect(tx.userGift.create).not.toHaveBeenCalled();
  });

  it('rejects recharge settlement when the WeChat paid amount does not match the transaction amount', async () => {
    const { client, tx, paidAt } = createSettlementClient();
    const service = createRechargeService(client as never);

    await expect(
      service.settleWechatRechargePayment('recharge-openid-1_idem-1', {
        transactionId: 'wx-transaction-1',
        paidAt,
        paidAmountCents: 9900
      })
    ).rejects.toMatchObject(
      new ApiError('RECHARGE_PAYMENT_AMOUNT_MISMATCH', 'Recharge payment amount does not match transaction amount', 409)
    );
    expect(tx.rechargeTransaction.update).not.toHaveBeenCalled();
    expect(tx.balanceLedger.create).not.toHaveBeenCalled();
    expect(tx.userGift.create).not.toHaveBeenCalled();
  });
});
