import { describe, expect, it, vi } from 'vitest';

import type { RechargePlansRuntimeConfigValue } from '@xiaipet/shared/types/recharge';
import {
  buildRechargeGiftDraft,
  buildRechargePlanDraft,
  getRechargeConfigViewModel,
  queryRechargePlans,
  saveRechargePlans
} from './recharge-config';

describe('merchant recharge config service', () => {
  it('builds editable recharge plan and gift drafts for the merchant form', () => {
    const plan = buildRechargePlanDraft();
    const gift = buildRechargeGiftDraft();

    expect(plan).toMatchObject({
      enabled: true,
      paidAmount: 0,
      bonusAmount: 0,
      description: '',
      gifts: []
    });
    expect(plan.planId).toMatch(/^plan-/);
    expect(gift).toMatchObject({
      name: '',
      description: '',
      validDays: 365
    });
    expect(gift.giftTemplateId).toMatch(/^gift-/);
  });

  it('queries recharge plans through the merchant API', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      plans: [
        {
          planId: 'plan-100',
          enabled: true,
          paidAmount: 100,
          bonusAmount: 10,
          description: '充 100 送 10',
          gifts: []
        }
      ]
    });

    await expect(queryRechargePlans(request)).resolves.toEqual([
      expect.objectContaining({
        planId: 'plan-100'
      })
    ]);
    expect(request).toHaveBeenCalledWith('/api/v1/merchant/recharge-plans', {
      method: 'GET',
      auth: 'merchant'
    });
  });

  it('saves normalized recharge plans through the merchant API', async () => {
    const request = vi.fn(async (_path: string, options: { body?: RechargePlansRuntimeConfigValue }) => ({
      ok: true,
      plans: options.body?.plans ?? []
    }));

    await saveRechargePlans(
      {
        plans: [
          {
            planId: ' plan-200 ',
            enabled: true,
            paidAmount: 200.129,
            bonusAmount: 20.999,
            description: '  储值  ',
            gifts: [
              {
                giftTemplateId: ' gift-cake ',
                name: ' 蛋糕 ',
                description: ' 领取后一年有效 ',
                validDays: 365.8
              }
            ]
          }
        ]
      },
      request as never
    );

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/recharge-plans', {
      method: 'PUT',
      auth: 'merchant',
      body: {
        plans: [
          {
            planId: 'plan-200',
            enabled: true,
            paidAmount: 200.12,
            bonusAmount: 20.99,
            description: '储值',
            gifts: [
              {
                giftTemplateId: 'gift-cake',
                name: '蛋糕',
                description: '领取后一年有效',
                validDays: 365
              }
            ]
          }
        ]
      }
    });
  });

  it('builds compact recharge config summary rows', () => {
    const view = getRechargeConfigViewModel([
      {
        planId: 'plan-100',
        enabled: true,
        paidAmount: 100,
        bonusAmount: 10,
        description: '充 100 送 10',
        gifts: [
          {
            giftTemplateId: 'gift-cake',
            name: '蛋糕',
            description: '',
            validDays: 365
          }
        ]
      },
      {
        planId: 'plan-200',
        enabled: false,
        paidAmount: 200,
        bonusAmount: 30,
        description: '暂停',
        gifts: []
      }
    ]);

    expect(view).toMatchObject({
      enabledCount: 1,
      totalGiftCount: 1,
      summaryLabel: '1 个启用档位 · 1 个赠品'
    });
    expect(view.rows).toEqual([
      expect.objectContaining({
        planId: 'plan-100',
        summaryLabel: '充 100 送 10 + 1 个赠品'
      }),
      expect.objectContaining({
        planId: 'plan-200',
        summaryLabel: '充 200 送 30 + 0 个赠品'
      })
    ]);
  });
});
