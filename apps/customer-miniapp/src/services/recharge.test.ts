import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomerApiRequester } from './api-client';
import {
  getRechargePlans,
  getSelectedRechargePlan,
  hydrateRechargePlans,
  selectRechargePlan,
  startRecharge
} from './recharge';

const plan5000 = {
  planId: 'plan-5000',
  enabled: true,
  paidAmount: 5000,
  bonusAmount: 500,
  description: '年度储值',
  gifts: [
    {
      giftTemplateId: 'cake-year',
      name: '周年蛋糕',
      description: '一年内可兑换',
      validDays: 365
    }
  ]
};

const plan10000 = {
  planId: 'plan-10000',
  enabled: true,
  paidAmount: 10000,
  bonusAmount: 1500,
  description: '家庭储值',
  gifts: []
};

describe('recharge service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hydrates plans, returns clones, and keeps a selected plan across refreshes', async () => {
    const request = vi.fn(async () => ({
      ok: true,
      plans: [plan5000, plan10000]
    }));

    const hydratedPlans = await hydrateRechargePlans(request as CustomerApiRequester);
    hydratedPlans[0].gifts[0].name = 'mutated by caller';

    expect(getRechargePlans()[0].gifts[0].name).toBe('周年蛋糕');
    expect(getSelectedRechargePlan()).toMatchObject({ planId: 'plan-5000' });

    expect(selectRechargePlan('plan-10000')).toMatchObject({ planId: 'plan-10000' });
    await hydrateRechargePlans(request as CustomerApiRequester);

    expect(getSelectedRechargePlan()).toMatchObject({ planId: 'plan-10000' });
    expect(selectRechargePlan('missing-plan')).toMatchObject({ planId: 'plan-10000' });
    expect(request).toHaveBeenCalledWith('/api/v1/customer/recharge-plans', {
      method: 'GET',
      auth: 'customer'
    });
  });

  it('creates a recharge transaction, requests WeChat payment, then syncs it', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1780000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456);

    const requestPayment = vi.fn((options: Record<string, unknown>) => {
      (options.success as () => void)?.();
    });
    vi.stubGlobal('wx', { requestPayment });

    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/recharge-transactions') {
        return {
          ok: true,
          transaction: {
            id: 'recharge-1',
            planId: 'plan-5000',
            status: 'processing'
          },
          paymentParams: {
            timeStamp: '123',
            nonceStr: 'nonce-1',
            package: 'prepay_id=prepay-1',
            signType: 'RSA',
            paySign: 'pay-sign-1'
          }
        };
      }

      if (path === '/api/v1/customer/recharge-transactions/recharge-1/payment-sync') {
        return {
          ok: true,
          transaction: {
            id: 'recharge-1',
            planId: 'plan-5000',
            status: 'paid'
          }
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(startRecharge('plan-5000', request as CustomerApiRequester)).resolves.toMatchObject({
      transaction: {
        id: 'recharge-1',
        status: 'paid'
      }
    });

    expect(request).toHaveBeenNthCalledWith(1, '/api/v1/customer/recharge-transactions', {
      method: 'POST',
      auth: 'customer',
      body: {
        planId: 'plan-5000',
        idempotencyKey: 'recharge-1780000000000-4fzyo8'
      }
    });
    expect(requestPayment).toHaveBeenCalledWith(expect.objectContaining({
      timeStamp: '123',
      nonceStr: 'nonce-1',
      package: 'prepay_id=prepay-1',
      signType: 'RSA',
      paySign: 'pay-sign-1'
    }));
    expect(request).toHaveBeenNthCalledWith(2, '/api/v1/customer/recharge-transactions/recharge-1/payment-sync', {
      method: 'POST',
      auth: 'customer'
    });
  });

  it('uses a caller-provided idempotency key across recharge retries', async () => {
    const requestPayment = vi.fn((options: Record<string, unknown>) => {
      (options.success as () => void)?.();
    });
    vi.stubGlobal('wx', { requestPayment });

    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/recharge-transactions') {
        return {
          ok: true,
          transaction: {
            id: 'recharge-retry',
            planId: 'plan-5000',
            status: 'processing'
          },
          paymentStatus: 'pending_wechat',
          paymentParams: {
            package: 'prepay_id=retry'
          }
        };
      }

      return {
        ok: true,
        transaction: {
          id: 'recharge-retry',
          planId: 'plan-5000',
          status: 'paid'
        }
      };
    });

    await startRecharge('plan-5000', request as CustomerApiRequester, {
      idempotencyKey: 'recharge-flow-key'
    });
    await startRecharge('plan-5000', request as CustomerApiRequester, {
      idempotencyKey: 'recharge-flow-key'
    });

    expect(request).toHaveBeenNthCalledWith(1, '/api/v1/customer/recharge-transactions', expect.objectContaining({
      body: {
        planId: 'plan-5000',
        idempotencyKey: 'recharge-flow-key'
      }
    }));
    expect(request).toHaveBeenNthCalledWith(3, '/api/v1/customer/recharge-transactions', expect.objectContaining({
      body: {
        planId: 'plan-5000',
        idempotencyKey: 'recharge-flow-key'
      }
    }));
  });

  it('syncs an idempotent replay when payment params are absent', async () => {
    const requestPayment = vi.fn();
    vi.stubGlobal('wx', { requestPayment });

    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/recharge-transactions') {
        return {
          ok: true,
          transaction: {
            id: 'recharge-replay',
            planId: 'plan-5000',
            status: 'processing'
          },
          paymentStatus: 'processing'
        };
      }

      if (path === '/api/v1/customer/recharge-transactions/recharge-replay/payment-sync') {
        return {
          ok: true,
          transaction: {
            id: 'recharge-replay',
            planId: 'plan-5000',
            status: 'paid'
          }
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(
      startRecharge('plan-5000', request as CustomerApiRequester, {
        idempotencyKey: 'recharge-replay-key'
      })
    ).resolves.toMatchObject({
      transaction: {
        id: 'recharge-replay',
        status: 'paid'
      }
    });

    expect(requestPayment).not.toHaveBeenCalled();
    expect(request).toHaveBeenNthCalledWith(2, '/api/v1/customer/recharge-transactions/recharge-replay/payment-sync', {
      method: 'POST',
      auth: 'customer'
    });
  });

  it('returns an already-paid idempotent replay without requiring payment params', async () => {
    const requestPayment = vi.fn();
    vi.stubGlobal('wx', { requestPayment });

    const request = vi.fn(async () => ({
      ok: true,
      transaction: {
        id: 'recharge-paid',
        planId: 'plan-5000',
        status: 'paid'
      },
      paymentStatus: 'paid'
    }));

    await expect(startRecharge('plan-5000', request as CustomerApiRequester)).resolves.toMatchObject({
      transaction: {
        id: 'recharge-paid',
        status: 'paid'
      }
    });

    expect(requestPayment).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('throws when a new pending WeChat recharge has no payment params', async () => {
    const request = vi.fn(async () => ({
      ok: true,
      transaction: {
        id: 'recharge-missing-params',
        planId: 'plan-5000',
        status: 'processing'
      },
      paymentStatus: 'pending_wechat'
    }));

    await expect(startRecharge('plan-5000', request as CustomerApiRequester)).rejects.toThrow(
      'missing_wechat_payment_params'
    );
  });
});
