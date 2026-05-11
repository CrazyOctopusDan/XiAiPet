import { describe, expect, it } from 'vitest';

import { ApiError } from '../../lib/errors';
import { testConfig } from '../../routes/test-helpers';
import { createAssetService } from './service';

const merchantContext = {
  openid: 'merchant-openid',
  merchantId: 'merchant-1',
  storeName: 'XiAiPet'
};

describe('asset service', () => {
  it('creates and confirms an OSS image upload', () => {
    const service = createAssetService(testConfig);
    const now = new Date('2026-05-11T00:00:00.000Z');
    const policy = service.createUploadPolicy(merchantContext, {
      role: 'product-cover',
      variantName: 'display',
      extension: 'jpg',
      contentType: 'image/jpeg',
      sizeBytes: 100_000
    }, now);

    const confirmed = service.confirmUpload(merchantContext, {
      confirmToken: policy.upload.confirmToken,
      role: 'product-cover',
      variantName: 'display',
      objectKey: policy.upload.objectKey,
      width: 960,
      height: 960,
      sizeBytes: 100_000,
      contentType: 'image/jpeg'
    }, new Date('2026-05-11T00:01:00.000Z'));

    expect(confirmed.storageId).toBe(`oss://xiaipet-test-assets/${policy.upload.objectKey}`);
    expect(confirmed.asset).toMatchObject({
      provider: 'oss',
      role: 'product-cover',
      bucket: 'xiaipet-test-assets',
      region: 'oss-cn-shanghai',
      objectKey: policy.upload.objectKey,
      width: 960,
      height: 960,
      variants: [{ name: 'display', objectKey: policy.upload.objectKey }]
    });
  });

  it('rejects invalid or expired confirmations', () => {
    const service = createAssetService(testConfig);
    const policy = service.createUploadPolicy(merchantContext, {
      role: 'runtime-banner',
      variantName: 'banner',
      extension: 'jpg',
      contentType: 'image/jpeg',
      sizeBytes: 100_000
    }, new Date('2026-05-11T00:00:00.000Z'));

    expect(() =>
      service.confirmUpload(merchantContext, {
        confirmToken: policy.upload.confirmToken,
        role: 'runtime-banner',
        variantName: 'banner',
        objectKey: `${policy.upload.objectKey}-tampered`,
        width: 1280,
        height: 720,
        sizeBytes: 100_000,
        contentType: 'image/jpeg'
      }, new Date('2026-05-11T00:01:00.000Z'))
    ).toThrow(new ApiError('ASSET_UPLOAD_MISMATCH', 'Asset upload confirmation does not match policy', 400));

    expect(() =>
      service.confirmUpload(merchantContext, {
        confirmToken: policy.upload.confirmToken,
        role: 'runtime-banner',
        variantName: 'banner',
        objectKey: policy.upload.objectKey,
        width: 1280,
        height: 720,
        sizeBytes: 100_000,
        contentType: 'image/jpeg'
      }, new Date('2026-05-11T00:16:00.000Z'))
    ).toThrow(new ApiError('ASSET_UPLOAD_EXPIRED', 'Asset upload policy has expired', 400));
  });

  it('rejects non-image uploads and oversized assets', () => {
    const service = createAssetService(testConfig);

    expect(() =>
      service.createUploadPolicy(merchantContext, {
        role: 'product-detail',
        variantName: 'detail',
        extension: 'pdf',
        contentType: 'application/pdf',
        sizeBytes: 100
      })
    ).toThrow(new ApiError('INVALID_ASSET_TYPE', 'Only image uploads are supported', 400));

    expect(() =>
      service.createUploadPolicy(merchantContext, {
        role: 'product-detail',
        variantName: 'detail',
        extension: 'jpg',
        contentType: 'image/jpeg',
        sizeBytes: 800_000
      })
    ).toThrow(new ApiError('ASSET_TOO_LARGE', 'Asset exceeds size limit', 400));
  });
});
