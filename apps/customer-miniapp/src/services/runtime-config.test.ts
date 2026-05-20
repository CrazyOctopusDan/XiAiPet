import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
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
        address: '上海市长宁区愚园路 1200 号',
        latitude: 31.2201,
        longitude: 121.4242,
        contactPhone: '13900000000'
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
        address: '上海市长宁区愚园路 1200 号',
        contactPhone: '13900000000'
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

    expect(runtimeConfig.banner.fileId).toBe('/assets/catalog/banner.png');
    expect(runtimeConfig.store.name).toBe('虾衣宠物烘焙工作室');
    expect(runtimeConfig.customNotice.enabled).toBe(false);
    expect(runtimeConfig.deliveryRules.tiers[0]?.explainer).toBe('5.0 公里内 98 元起送，配送费 0 元');
    expect(getCachedCustomerRuntimeConfig()).toMatchObject(runtimeConfig);
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
});
