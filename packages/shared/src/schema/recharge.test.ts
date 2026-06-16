import { describe, expect, it } from 'vitest';

import { normalizeRechargePlansConfig, summarizeUserGiftStatus } from './recharge';

describe('recharge schema', () => {
  it('normalizes recharge plans and gift valid days', () => {
    const result = normalizeRechargePlansConfig({
      plans: [
        {
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
        }
      ]
    });

    expect(result.plans[0]).toMatchObject({
      planId: 'plan-5000',
      enabled: true,
      paidAmount: 5000,
      bonusAmount: 500
    });
    expect(result.plans[0]?.gifts[0]).toMatchObject({
      giftTemplateId: 'cake-year',
      validDays: 365
    });
  });

  it('rejects non-positive recharge amount', () => {
    expect(() =>
      normalizeRechargePlansConfig({
        plans: [
          {
            planId: 'bad',
            enabled: true,
            paidAmount: 0,
            bonusAmount: 0,
            description: '',
            gifts: [{ giftTemplateId: 'gift-1', name: '蛋糕', description: '', validDays: 1 }]
          }
        ]
      })
    ).toThrow('INVALID_RECHARGE_PLAN');
  });

  it('rejects invalid gift valid days', () => {
    expect(() =>
      normalizeRechargePlansConfig({
        plans: [
          {
            planId: 'plan-1000',
            enabled: true,
            paidAmount: 1000,
            bonusAmount: 0,
            description: '',
            gifts: [{ giftTemplateId: 'gift-1', name: '蛋糕', description: '', validDays: 0 }]
          }
        ]
      })
    ).toThrow('INVALID_RECHARGE_GIFT');
  });

  it('rejects empty gift template id', () => {
    expect(() =>
      normalizeRechargePlansConfig({
        plans: [
          {
            planId: 'plan-1000',
            enabled: true,
            paidAmount: 1000,
            bonusAmount: 0,
            description: '',
            gifts: [{ giftTemplateId: '', name: '蛋糕', description: '', validDays: 30 }]
          }
        ]
      })
    ).toThrow('INVALID_RECHARGE_GIFT');
  });

  it('summarizes expired available gifts as expired for display', () => {
    expect(
      summarizeUserGiftStatus(
        {
          status: 'available',
          expiresAt: '2026-01-01T00:00:00.000Z'
        },
        new Date('2026-06-16T00:00:00.000Z')
      )
    ).toBe('expired');
  });
});
