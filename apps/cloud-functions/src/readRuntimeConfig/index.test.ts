import { describe, expect, it } from 'vitest';

import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

describe('readRuntimeConfig cloud function', () => {
  it('returns only customer-safe banner, store, custom-notice, and delivery-rule fields', async () => {
    const result = await main(
      {},
      undefined,
      {
        listSections: async () => [
          {
            sectionId: 'banner',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: {
              openid: 'merchant-openid',
              name: '店主小虾'
            },
            value: {
              fileId: 'cloud://xiaipet-prod.123/banner/home.png',
              altText: '首页主 Banner'
            }
          },
          {
            sectionId: 'membership-tiers',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: {
              openid: 'merchant-openid',
              name: '店主小虾'
            },
            value: {
              tiers: []
            }
          }
        ]
      }
    );

    expect(result).toMatchObject({
      banner: {
        fileId: 'cloud://xiaipet-prod.123/banner/home.png'
      },
      store: null,
      customNotice: null,
      deliveryRules: null
    });
    expect(result).not.toHaveProperty('membershipTiers');
  });
});
