import { describe, expect, it, vi } from 'vitest';

import {
  LOCKED_DELIVERY_RULE_ROWS,
  getRuntimeConfigAdminViewModel,
  queryRuntimeConfigSections,
  saveRuntimeConfigSection
} from './runtime-config-admin';

describe('runtime config admin service', () => {
  it('queries runtime config sections and fills the five locked sections', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      sections: []
    });

    const sections = await queryRuntimeConfigSections(request);
    const view = getRuntimeConfigAdminViewModel(sections, {});

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/runtime-config/sections', {
      method: 'GET',
      auth: 'merchant'
    });
    expect(view.sections.map((item) => item.sectionId)).toEqual([
      'store-profile',
      'delivery-rules',
      'membership-tiers',
      'banner',
      'custom-notice'
    ]);
  });

  it('preserves membership tiers as threshold + name + description tuples', () => {
    const view = getRuntimeConfigAdminViewModel(
      [
        {
          sectionId: 'membership-tiers',
          updatedAt: '2026-04-18T10:00:00.000Z',
          updatedBy: {
            openid: 'merchant-openid',
            name: '虾衣宠物烘焙工作室'
          },
          value: {
            tiers: [
              {
                tierId: 'vip',
                threshold: 500,
                name: '金卡会员',
                description: '累计消费满 500 元'
              }
            ]
          }
        }
      ],
      { 'membership-tiers': true }
    );

    expect(view.sections.find((item) => item.sectionId === 'membership-tiers')).toMatchObject({
      dirtyLabel: '未保存',
      membershipRows: [
        expect.objectContaining({
          thresholdLabel: '累计消费门槛 500',
          name: '金卡会员',
          description: '累计消费满 500 元'
        })
      ]
    });
  });

  it('exposes delivery fees as exact locked explainer rows instead of generic blobs', () => {
    const view = getRuntimeConfigAdminViewModel([], {});
    const delivery = view.sections.find((item) => item.sectionId === 'delivery-rules');

    expect(delivery?.deliveryRows).toEqual(
      LOCKED_DELIVERY_RULE_ROWS.map((row) =>
        expect.objectContaining({
          explainer: row.explainer
        })
      )
    );
  });

  it('saves one runtime config section at a time', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      section: {
        sectionId: 'custom-notice',
        updatedAt: '2026-04-18T10:00:00.000Z',
        updatedBy: {
          openid: 'merchant-openid',
          name: '虾衣宠物烘焙工作室'
        },
        value: {
          enabled: true,
          content: '请提前联系确认'
        }
      }
    });

    await saveRuntimeConfigSection(
      {
        sectionId: 'custom-notice',
        updatedAt: '2026-04-18T10:00:00.000Z',
        updatedBy: {
          openid: 'merchant-openid',
          name: '虾衣宠物烘焙工作室'
        },
        value: {
          enabled: true,
          content: '请提前联系确认'
        }
      },
      request
    );

    expect(request).toHaveBeenCalledWith('/api/v1/merchant/runtime-config/sections/custom-notice', {
      method: 'PUT',
      body: expect.objectContaining({
        sectionId: 'custom-notice'
      }),
      auth: 'merchant'
    });
  });
});
