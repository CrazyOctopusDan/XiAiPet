import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildMembershipTierCards,
  findMembershipTierCard,
  findMembershipTierCardBySpent,
  getCachedCustomerRuntimeConfig,
  hydrateCustomerRuntimeConfig,
  resetCustomerRuntimeConfigCache,
  resolveRuntimeBannerImageSrc
} from './runtime-config';

describe('customer runtime config service', () => {
  beforeEach(() => {
    resetCustomerRuntimeConfigCache();
  });

  it('reads customer-facing runtime config from the HTTP runtime config API', async () => {
    const requestRuntimeConfig = vi.fn().mockResolvedValue({
      ok: true,
      banner: {
        fileId: 'cloud://xiaipet-prod.123/banner/home.png',
        altText: '本周主推'
      },
      store: {
        storeName: '喜爱宠物烘焙',
        address: '上海市长宁区愚园路 1200 号',
        latitude: 31.2201,
        longitude: 121.4242,
        wechatId: 'xiaipet-bakery',
        ownerPhone: '13900000000'
      },
      customNotice: {
        enabled: false,
        content: '已关闭提示'
      },
      deliveryRules: {
        tiers: [
          {
            distanceKm: 5,
            minimumOrderAmount: 98,
            deliveryFee: 0,
            explainer: '5.0 公里内 98 元起送，配送费 0 元'
          }
        ]
      },
      membershipTiers: {
        tiers: [
          {
            tierId: 'regular',
            threshold: 0,
            name: '普通会员',
            description: '完成注册即可享受基础购买权益。'
          },
          {
            tierId: 'gold',
            threshold: 998,
            name: '金卡会员',
            description: '累计消费满 998 元可升级。'
          }
        ]
      }
    });

    const runtimeConfig = await hydrateCustomerRuntimeConfig(requestRuntimeConfig);

    expect(requestRuntimeConfig).toHaveBeenCalledWith();
    expect(runtimeConfig).toMatchObject({
      banner: {
        fileId: 'cloud://xiaipet-prod.123/banner/home.png',
        altText: '本周主推'
      },
      store: {
        storeName: '喜爱宠物烘焙',
        address: '上海市长宁区愚园路 1200 号',
        wechatId: 'xiaipet-bakery',
        ownerPhone: '13900000000'
      },
      customNotice: {
        enabled: false,
        content: '已关闭提示'
      },
      deliveryRules: {
        tiers: [
          expect.objectContaining({
            distanceKm: 5,
            deliveryFee: 0
          })
        ]
      },
      membershipTiers: {
        tiers: [
          expect.objectContaining({
            tierId: 'regular',
            name: '普通会员',
            threshold: 0
          }),
          expect.objectContaining({
            tierId: 'gold',
            name: '金卡会员',
            threshold: 998
          })
        ]
      }
    });
  });

  it('keeps durable defaults when sections are missing and updates the shared cache', async () => {
    const runtimeConfig = await hydrateCustomerRuntimeConfig(
      vi.fn().mockResolvedValue({
        ok: true,
        banner: null,
        store: null,
        customNotice: {
          enabled: false,
          content: '临时停用'
        },
        deliveryRules: null
      })
    );

    expect(runtimeConfig.banner.fileId).toBe('/assets/catalog/banner.jpg');
    expect(runtimeConfig.store.name).toBe('虾衣宠物烘焙工作室');
    expect(runtimeConfig.customNotice.enabled).toBe(false);
    expect(runtimeConfig.deliveryRules.tiers[0]?.explainer).toBe('5.0 公里内 98 元起送，配送费 0 元');
    expect(runtimeConfig.membershipTiers.tiers).toEqual([]);
    expect(getCachedCustomerRuntimeConfig()).toMatchObject(runtimeConfig);
  });

  it('does not expose local business copy or membership tiers before merchant config is loaded', () => {
    const runtimeConfig = getCachedCustomerRuntimeConfig();

    expect(runtimeConfig.store.wechatId).toBe('');
    expect(runtimeConfig.store.ownerPhone).toBe('');
    expect(runtimeConfig.customNotice).toEqual({
      enabled: false,
      content: ''
    });
    expect(runtimeConfig.membershipTiers.tiers).toEqual([]);
  });

  it('also reads runtime config from section documents returned by the API', async () => {
    const runtimeConfig = await hydrateCustomerRuntimeConfig(
      vi.fn().mockResolvedValue({
        ok: true,
        sections: [
          {
            sectionId: 'store-profile',
            updatedAt: '2026-05-22T10:00:00.000Z',
            updatedBy: { openid: 'merchant', name: '店主' },
            value: {
              storeName: '喜爱宠物烘焙',
              address: '上海市徐汇区永嘉路 88 号',
              latitude: 31.2101,
              longitude: 121.4501,
              wechatId: 'xiaipet-vip',
              ownerPhone: '13600000000'
            }
          },
          {
            sectionId: 'custom-notice',
            updatedAt: '2026-05-22T10:00:00.000Z',
            updatedBy: { openid: 'merchant', name: '店主' },
            value: {
              enabled: true,
              content: '购前请确认配送时间。'
            }
          },
          {
            sectionId: 'membership-tiers',
            updatedAt: '2026-05-22T10:00:00.000Z',
            updatedBy: { openid: 'merchant', name: '店主' },
            value: {
              tiers: [
                {
                  tierId: 'silver',
                  threshold: 500,
                  name: '银卡会员',
                  description: '累计消费满 500 元可升级。'
                }
              ]
            }
          }
        ]
      })
    );

    expect(runtimeConfig.store).toMatchObject({
      name: '喜爱宠物烘焙',
      wechatId: 'xiaipet-vip',
      ownerPhone: '13600000000'
    });
    expect(runtimeConfig.customNotice.content).toBe('购前请确认配送时间。');
    expect(runtimeConfig.membershipTiers.tiers).toEqual([
      {
        tierId: 'silver',
        threshold: 500,
        name: '银卡会员',
        description: '累计消费满 500 元可升级。'
      }
    ]);
  });

  it('resolves OSS banner asset URLs before falling back to fileId', () => {
    expect(resolveRuntimeBannerImageSrc({
      fileId: 'oss://bucket/banner.jpg',
      altText: 'Banner',
      asset: {
        provider: 'oss',
        role: 'runtime-banner',
        bucket: 'bucket',
        region: 'oss-cn-shanghai',
        objectKey: 'banner.jpg',
        url: 'https://assets.example.test/banner.jpg',
        width: 1280,
        height: 720,
        sizeBytes: 1000,
        contentType: 'image/jpeg',
        uploadedAt: '2026-05-11T00:00:00.000Z',
        variants: [
          {
            name: 'banner',
            objectKey: 'banner-banner.jpg',
            url: 'https://assets.example.test/banner-banner.jpg',
            width: 1280,
            height: 720,
            sizeBytes: 1000,
            contentType: 'image/jpeg'
          }
        ]
      }
    })).toBe('https://assets.example.test/banner-banner.jpg');
  });

  it('creates a stable low-to-high membership card progression for any number of tiers', () => {
    const cards = buildMembershipTierCards([
      {
        tierId: 'top',
        threshold: 10000,
        name: '超级买家',
        description: '最高等级'
      },
      {
        tierId: 'base',
        threshold: 0,
        name: '标准',
        description: '默认会员等级'
      },
      {
        tierId: 'middle',
        threshold: 5000,
        name: '银卡',
        description: '中间等级'
      }
    ]);

    expect(cards.map((item) => item.name)).toEqual(['标准', '银卡', '超级买家']);
    expect(cards[0]?.cardStyle).toContain('--member-card-progress: 0');
    expect(cards[1]?.cardStyle).toContain('--member-card-progress: 0.5');
    expect(cards[2]?.cardStyle).toContain('--member-card-progress: 1');
    expect(cards[0]?.cardStyle).toContain('--member-card-bg: linear-gradient(135deg');
    expect(cards[2]?.cardStyle).toContain('#1C1917');
  });

  it('matches the current profile member level to the same card style used by the membership page', () => {
    const cards = buildMembershipTierCards([
      {
        tierId: 'base',
        threshold: 0,
        name: '标准',
        description: '默认会员等级'
      },
      {
        tierId: 'top',
        threshold: 10000,
        name: '超级买家',
        description: '最高等级'
      }
    ]);

    expect(findMembershipTierCard(cards, '超级买家')).toMatchObject({
      tierId: 'top',
      name: '超级买家'
    });
    expect(findMembershipTierCard(cards, '不存在')).toMatchObject({
      tierId: 'base',
      name: '标准'
    });
    expect(findMembershipTierCardBySpent(cards, 12000)).toMatchObject({
      tierId: 'top',
      name: '超级买家'
    });
    expect(findMembershipTierCardBySpent(cards, 200)).toMatchObject({
      tierId: 'base',
      name: '标准'
    });
  });
});
