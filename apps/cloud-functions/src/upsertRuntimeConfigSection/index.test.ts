import { describe, expect, it } from 'vitest';

import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

const merchantUser = {
  openid: 'merchant-openid',
  merchantId: 'merchant-001',
  storeName: '虾衣宠物烘焙工作室',
  enabled: true,
  grantedAt: '2026-04-01T00:00:00.000Z'
};

describe('upsertRuntimeConfigSection cloud function', () => {
  it('saves one fixed-key runtime config section at a time and preserves section metadata', async () => {
    const section = {
      sectionId: 'custom-notice',
      updatedAt: '2026-04-17T12:00:00.000Z',
      updatedBy: {
        openid: 'merchant-openid',
        name: '店主小虾'
      },
      value: {
        enabled: false,
        content: '本周配送高峰，请尽量提前下单。'
      }
    } as const;

    const result = await main(
      {
        section,
        merchantUser
      },
      { OPENID: 'merchant-openid' },
      {
        saveSection: async (payload) => payload
      }
    );

    expect(result.section).toEqual(section);
  });
});
