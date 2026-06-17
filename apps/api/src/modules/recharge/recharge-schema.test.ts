import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizeRechargePlansConfig } from './recharge-schema';

const sharedSchemaPath = resolve(__dirname, '../../../../../packages/shared/src/schema/recharge.js');
const { normalizeRechargePlansConfig: normalizeSharedRechargePlansConfig } = require(sharedSchemaPath) as {
  normalizeRechargePlansConfig(input: unknown): unknown;
};

describe('api recharge runtime schema', () => {
  it('matches shared recharge plan normalization for runtime config payloads', () => {
    const payload = {
      plans: [
        {
          planId: ' plan-5000 ',
          enabled: true,
          paidAmount: '5000.129',
          bonusAmount: '600.456',
          description: '  充值说明  ',
          gifts: [
            {
              giftTemplateId: ' cake-365 ',
              name: ' 周年蛋糕 ',
              description: ' 一年内有效 ',
              validDays: '365.9'
            }
          ]
        }
      ]
    };

    expect(normalizeRechargePlansConfig(payload)).toEqual(normalizeSharedRechargePlansConfig(payload));
  });

  it('matches shared recharge plan validation errors', () => {
    const invalidPayload = {
      plans: [
        {
          planId: 'plan-invalid',
          enabled: true,
          paidAmount: 5000,
          bonusAmount: 0,
          description: '',
          gifts: [{ giftTemplateId: 'gift-invalid', name: '无效赠品', description: '', validDays: 0 }]
        }
      ]
    };

    expect(() => normalizeRechargePlansConfig(invalidPayload)).toThrow('INVALID_RECHARGE_GIFT');
    expect(() => normalizeSharedRechargePlansConfig(invalidPayload)).toThrow('INVALID_RECHARGE_GIFT');
  });

  it('does not use monorepo shared source paths at API runtime', () => {
    const source = readFileSync(resolve(__dirname, 'service.ts'), 'utf8');
    expect(source).not.toContain('packages/shared/src/schema/recharge');
  });
});
