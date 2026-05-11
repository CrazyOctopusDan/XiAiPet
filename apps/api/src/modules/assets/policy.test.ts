import { describe, expect, it } from 'vitest';

import { createOssObjectKey, createOssPostPolicy } from './policy';
import { testConfig } from '../../routes/test-helpers';

describe('OSS asset policy', () => {
  it('creates stable object keys scoped by merchant, role, year, and variant', () => {
    expect(createOssObjectKey({
      merchantId: 'merchant-1',
      role: 'product-cover',
      variantName: 'display',
      extension: '.JPG',
      now: new Date('2026-05-11T00:00:00.000Z'),
      assetId: 'asset-1'
    })).toBe('merchant/merchant-1/assets/product-cover/2026/asset-1-display.jpg');
  });

  it('creates an Aliyun OSS POST policy for image uploads', () => {
    const policy = createOssPostPolicy({
      config: testConfig,
      objectKey: 'merchant/merchant-1/assets/product-cover/2026/asset-1-display.jpg',
      contentType: 'image/jpeg',
      maxSizeBytes: 460_800,
      expiresAt: new Date('2026-05-11T00:15:00.000Z')
    });

    expect(policy.url).toBe('https://xiaipet-test-assets.oss-cn-shanghai.aliyuncs.com');
    expect(policy.formData).toMatchObject({
      key: 'merchant/merchant-1/assets/product-cover/2026/asset-1-display.jpg',
      OSSAccessKeyId: 'test-oss-key-id',
      success_action_status: '200',
      'x-oss-object-acl': 'public-read'
    });

    const document = JSON.parse(Buffer.from(policy.formData.policy, 'base64').toString('utf8'));
    expect(document.conditions).toContainEqual({ key: 'merchant/merchant-1/assets/product-cover/2026/asset-1-display.jpg' });
    expect(document.conditions).toContainEqual(['content-length-range', 1, 460_800]);
    expect(document.conditions).toContainEqual(['starts-with', '$Content-Type', 'image/']);
  });
});
