import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MerchantApiRequester } from './api-client';
import {
  confirmUpload,
  requestUploadPolicy,
  uploadFileToOss,
  uploadMerchantAsset
} from './assets';

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as { wx?: unknown }).wx;
});

describe('merchant asset upload service', () => {
  it('requests policy and confirmation through merchant API paths', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        upload: {
          method: 'POST',
          url: 'https://oss.example.test',
          fileFieldName: 'file',
          formData: {},
          objectKey: 'merchant/m1/assets/product-cover/2026/a-display.jpg',
          expiresAt: '2026-05-11T00:15:00.000Z',
          confirmToken: 'token'
        }
      })
      .mockResolvedValueOnce({
        asset: { provider: 'oss', variants: [] },
        storageId: 'oss://bucket/key'
      });

    await requestUploadPolicy({
      role: 'product-cover',
      variantName: 'display',
      extension: 'jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1000
    }, request);
    await confirmUpload({
      confirmToken: 'token',
      role: 'product-cover',
      variantName: 'display',
      objectKey: 'merchant/m1/assets/product-cover/2026/a-display.jpg',
      width: 960,
      height: 960,
      sizeBytes: 1000,
      contentType: 'image/jpeg'
    }, request);

    expect(request).toHaveBeenNthCalledWith(1, '/api/v1/merchant/assets/upload-policies', {
      method: 'POST',
      body: {
        role: 'product-cover',
        variantName: 'display',
        extension: 'jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1000
      },
      auth: 'merchant'
    });
    expect(request).toHaveBeenNthCalledWith(2, '/api/v1/merchant/assets/uploads/confirm', expect.objectContaining({
      method: 'POST',
      auth: 'merchant'
    }));
  });

  it('uploads files to OSS with the file field name from policy', async () => {
    (globalThis as any).wx = {
      uploadFile: vi.fn((options) => options.success({ statusCode: 200 }))
    };

    await uploadFileToOss('/tmp/cover.jpg', {
      method: 'POST',
      url: 'https://oss.example.test',
      fileFieldName: 'file',
      formData: { key: 'merchant/m1/a.jpg' },
      objectKey: 'merchant/m1/a.jpg',
      expiresAt: '2026-05-11T00:15:00.000Z',
      confirmToken: 'token'
    });

    expect((globalThis as any).wx.uploadFile).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://oss.example.test',
      filePath: '/tmp/cover.jpg',
      name: 'file',
      formData: { key: 'merchant/m1/a.jpg' }
    }));
  });

  it('rejects processed images that remain too large', async () => {
    (globalThis as any).wx = {
      compressImage: vi.fn((options) => options.success({ tempFilePath: options.src })),
      cropImage: vi.fn((options) => options.success({ tempFilePath: options.src })),
      getFileInfo: vi.fn((options) => options.success({ size: 999_999 })),
      getImageInfo: vi.fn((options) => options.success({ width: 960, height: 960 }))
    };

    await expect(uploadMerchantAsset('product-cover', {
      filePath: '/tmp/cover.jpg',
      request: vi.fn()
    })).rejects.toMatchObject({
      code: 'ASSET_FILE_TOO_LARGE',
      message: 'Image exceeds the upload size limit',
      statusCode: 400
    });
  });

  it('uploads cover variants and combines returned asset variants', async () => {
    (globalThis as any).wx = {
      compressImage: vi.fn((options) => options.success({ tempFilePath: options.src })),
      cropImage: vi.fn((options) => options.success({ tempFilePath: options.src })),
      getFileInfo: vi.fn((options) => options.success({ size: 1000 })),
      getImageInfo: vi.fn((options) => options.success({ width: 480, height: 480 })),
      uploadFile: vi.fn((options) => options.success({ statusCode: 200 }))
    };
    const request = vi.fn((path: string, options: any) => {
      if (path.endsWith('/upload-policies')) {
        const variantName = options.body.variantName;
        return Promise.resolve({
          upload: {
            method: 'POST',
            url: 'https://oss.example.test',
            fileFieldName: 'file',
            formData: { key: `key-${variantName}` },
            objectKey: `key-${variantName}`,
            expiresAt: '2026-05-11T00:15:00.000Z',
            confirmToken: `token-${variantName}`
          }
        });
      }

      const variantName = options.body.variantName;
      return Promise.resolve({
        storageId: `oss://bucket/key-${variantName}`,
        asset: {
          provider: 'oss',
          role: 'product-cover',
          bucket: 'bucket',
          region: 'oss-cn-shanghai',
          objectKey: `key-${variantName}`,
          url: `https://assets.example.test/key-${variantName}`,
          width: 480,
          height: 480,
          sizeBytes: 1000,
          contentType: 'image/jpeg',
          uploadedAt: '2026-05-11T00:00:00.000Z',
          variants: [
            {
              name: variantName,
              objectKey: `key-${variantName}`,
              url: `https://assets.example.test/key-${variantName}`,
              width: 480,
              height: 480,
              sizeBytes: 1000,
              contentType: 'image/jpeg'
            }
          ]
        }
      });
    }) as unknown as MerchantApiRequester;

    const result = await uploadMerchantAsset('product-cover', {
      filePath: '/tmp/cover.jpg',
      request
    });

    expect(result.asset.variants.map((variant) => variant.name).sort()).toEqual(['display', 'thumbnail']);
    expect((globalThis as any).wx.uploadFile).toHaveBeenCalledTimes(2);
  });
});
