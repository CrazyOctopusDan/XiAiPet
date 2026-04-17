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

describe('getRuntimeConfigSections cloud function', () => {
  it('returns independently saved fixed-key admin sections behind merchant auth', async () => {
    const result = await main(
      {
        merchantUser
      },
      { OPENID: 'merchant-openid' },
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
          }
        ]
      }
    );

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].sectionId).toBe('banner');
  });
});
