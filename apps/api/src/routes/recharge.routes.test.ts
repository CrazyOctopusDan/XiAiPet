import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { authHeader, merchantAccountAuthHeader, testConfig } from './test-helpers';

function createRechargeService(overrides: Record<string, unknown> = {}) {
  return {
    listCustomerRechargePlans: vi.fn(async () => []),
    listMerchantRechargePlans: vi.fn(async () => []),
    saveMerchantRechargePlans: vi.fn(async () => ({ ok: true, section: {}, plans: [] })),
    createCustomerRechargeTransaction: vi.fn(async () => ({
      ok: true,
      paymentStatus: 'pending_wechat',
      transaction: { id: 'recharge-1' },
      paymentParams: { package: 'prepay_id=mock' }
    })),
    syncCustomerRechargeTransaction: vi.fn(async () => ({ ok: true, transaction: { id: 'recharge-1' } })),
    settleWechatRechargePayment: vi.fn(),
    ...overrides
  };
}

describe('recharge routes', () => {
  it('wires customer recharge plan and transaction endpoints behind customer auth', async () => {
    const rechargeService = createRechargeService({
      listCustomerRechargePlans: vi.fn(async () => [{ planId: 'plan-1', enabled: true }])
    });
    const app = buildApp({
      config: testConfig,
      dependencies: {
        rechargeService
      }
    });

    const plansResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/recharge-plans',
      headers: authHeader('customer-openid')
    });
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/recharge-transactions',
      headers: authHeader('customer-openid'),
      payload: {
        planId: 'plan-1',
        idempotencyKey: 'idem-1'
      }
    });
    const syncResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/recharge-transactions/recharge-1/payment-sync',
      headers: authHeader('customer-openid')
    });

    expect(plansResponse.statusCode).toBe(200);
    expect(plansResponse.json()).toEqual([{ planId: 'plan-1', enabled: true }]);
    expect(createResponse.statusCode).toBe(200);
    expect(syncResponse.statusCode).toBe(200);
    expect(rechargeService.createCustomerRechargeTransaction).toHaveBeenCalledWith('customer-openid', {
      planId: 'plan-1',
      idempotencyKey: 'idem-1'
    });
    expect(rechargeService.syncCustomerRechargeTransaction).toHaveBeenCalledWith('customer-openid', 'recharge-1');
  });

  it('wires merchant recharge plan endpoints behind merchant admin auth', async () => {
    const rechargeService = createRechargeService();
    const merchantAccountService = {
      getActiveAccount: vi.fn(async () => ({
        id: 'acct-admin',
        username: 'admin',
        role: 'admin' as const,
        mustChangePassword: false
      }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        rechargeService,
        merchantAccountService
      }
    });

    const plansResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/recharge-plans',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin' })
    });
    const saveResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/merchant/recharge-plans',
      headers: merchantAccountAuthHeader({ accountId: 'acct-admin' }),
      payload: {
        plans: [{ planId: 'plan-1', paidAmount: 100, bonusAmount: 20, description: '充值', gifts: [] }]
      }
    });

    expect(plansResponse.statusCode).toBe(200);
    expect(saveResponse.statusCode).toBe(200);
    expect(rechargeService.listMerchantRechargePlans).toHaveBeenCalledWith(expect.objectContaining({
      openid: 'acct-admin',
      role: 'admin'
    }));
    expect(rechargeService.saveMerchantRechargePlans).toHaveBeenCalledWith(
      expect.objectContaining({ openid: 'acct-admin' }),
      {
        plans: [{ planId: 'plan-1', paidAmount: 100, bonusAmount: 20, description: '充值', gifts: [] }]
      }
    );
  });
});
