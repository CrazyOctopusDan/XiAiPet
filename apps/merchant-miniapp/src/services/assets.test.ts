import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MerchantApiRequester } from './api-client';
import {
  confirmUpload,
  getFileInfo,
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

  it('uses FileSystemManager getFileInfo when available', async () => {
    const fsGetFileInfo = vi.fn((options) => options.success({ size: 1234 }));
    (globalThis as any).wx = {
      getFileSystemManager: vi.fn(() => ({
        getFileInfo: fsGetFileInfo
      }))
    };

    await expect(getFileInfo('/tmp/cover.jpg')).resolves.toEqual({ size: 1234 });
    expect(fsGetFileInfo).toHaveBeenCalledWith(expect.objectContaining({ filePath: '/tmp/cover.jpg' }));
  });

  it('resolves http temporary files to a FileSystemManager readable path', async () => {
    const fsGetFileInfo = vi.fn((options) => options.success({ size: 4567 }));
    (globalThis as any).wx = {
      getFileSystemManager: vi.fn(() => ({
        getFileInfo: fsGetFileInfo
      }))
    };

    await expect(getFileInfo('http://tmp/D0u2YtgEUCwjf4ede4b1d8b699cc5ca8e4c4b792941c.jpg')).resolves.toEqual({
      size: 4567
    });
    expect(fsGetFileInfo).toHaveBeenCalledWith(expect.objectContaining({
      filePath: '/tmp/D0u2YtgEUCwjf4ede4b1d8b699cc5ca8e4c4b792941c.jpg'
    }));
  });

  it('falls back to the DevTools disk path when getImageInfo does not expose a local path', async () => {
    const fsGetFileInfo = vi.fn((options) => options.success({ size: 3456 }));
    (globalThis as any).wx = {
      getFileSystemManager: vi.fn(() => ({
        getFileInfo: fsGetFileInfo
      })),
      getImageInfo: vi.fn((options) => options.success({
        width: 960,
        height: 960
      }))
    };

    await expect(getFileInfo('http://tmp/4jBsXAfu7obqf4ede4b1d8b699cc5ca8e4c4b792941c.jpg')).resolves.toEqual({
      size: 3456
    });
    expect(fsGetFileInfo).toHaveBeenCalledWith(expect.objectContaining({
      filePath: '/tmp/4jBsXAfu7obqf4ede4b1d8b699cc5ca8e4c4b792941c.jpg'
    }));
  });

  it('uploads http temporary files directly to OSS without FileSystemManager reads', async () => {
    const getFileInfo = vi.fn();
    (globalThis as any).wx = {
      getFileSystemManager: vi.fn(() => ({
        getFileInfo
      })),
      uploadFile: vi.fn((options) => options.success({ statusCode: 200 }))
    };
    const request = vi.fn((path: string, options: any) => {
      if (path.endsWith('/upload-policies')) {
        return Promise.resolve({
          upload: {
            method: 'POST',
            url: 'https://oss.example.test',
            fileFieldName: 'file',
            formData: { key: 'key-display' },
            objectKey: 'key-display',
            expiresAt: '2026-05-11T00:15:00.000Z',
            confirmToken: 'token-display'
          }
        });
      }

      return Promise.resolve({
        storageId: 'oss://bucket/key-display',
        asset: {
          provider: 'oss',
          role: 'product-cover',
          bucket: 'bucket',
          region: 'oss-cn-shanghai',
          objectKey: 'key-display',
          url: 'https://assets.example.test/key-display',
          width: 960,
          height: 960,
          sizeBytes: 460_800,
          contentType: 'image/jpeg',
          uploadedAt: '2026-05-11T00:00:00.000Z',
          variants: []
        }
      });
    }) as unknown as MerchantApiRequester;

    await uploadMerchantAsset('product-cover', {
      filePath: 'http://tmp/4jBsXAfu7obqf4ede4b1d8b699cc5ca8e4c4b792941c.jpg',
      fileSizeBytes: 780_000,
      request
    });

    expect((globalThis as any).wx.uploadFile).toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'http://tmp/4jBsXAfu7obqf4ede4b1d8b699cc5ca8e4c4b792941c.jpg'
    }));
    expect(getFileInfo).not.toHaveBeenCalled();
  });

  it('uploads a source image and derives OSS processed cover variants', async () => {
    const fsGetFileInfo = vi.fn((options) => options.success({ size: 1000 }));
    (globalThis as any).wx = {
      getImageInfo: vi.fn((options) => options.success({ width: 960, height: 640, path: '/tmp/cover.jpg' })),
      getFileSystemManager: vi.fn(() => ({
        getFileInfo: fsGetFileInfo
      })),
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
          width: options.body.width,
          height: options.body.height,
          sizeBytes: options.body.sizeBytes,
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
      fileSizeBytes: 1000,
      request
    });

    expect(result.asset.variants.map((variant) => variant.name).sort()).toEqual(['display', 'thumbnail']);
    expect(result.asset.width).toBe(960);
    expect(result.asset.height).toBe(640);
    expect(result.asset.variants).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'thumbnail',
        width: 360,
        height: 360,
        url: 'https://assets.example.test/key-display?x-oss-process=image/resize,m_fill,w_360,h_360/format,webp/quality,q_76'
      }),
      expect.objectContaining({
        name: 'display',
        width: 720,
        height: 720,
        url: 'https://assets.example.test/key-display?x-oss-process=image/resize,m_fill,w_720,h_720/format,webp/quality,q_80'
      })
    ]));
    expect(request).toHaveBeenNthCalledWith(2, '/api/v1/merchant/assets/uploads/confirm', expect.objectContaining({
      body: expect.objectContaining({
        width: 960,
        height: 640
      })
    }));
    expect((globalThis as any).wx.uploadFile).toHaveBeenCalledTimes(1);
  });

  it('uses width-only WebP processing for long detail images and homepage banners', async () => {
    (globalThis as any).wx = {
      uploadFile: vi.fn((options) => options.success({ statusCode: 200 }))
    };
    const request = vi.fn((path: string, options: any) => {
      if (path.endsWith('/upload-policies')) {
        return Promise.resolve({
          upload: {
            method: 'POST',
            url: 'https://oss.example.test',
            fileFieldName: 'file',
            formData: { key: `key-${options.body.role}` },
            objectKey: `key-${options.body.role}`,
            expiresAt: '2026-05-11T00:15:00.000Z',
            confirmToken: `token-${options.body.role}`
          }
        });
      }

      return Promise.resolve({
        storageId: `oss://bucket/${options.body.objectKey}`,
        asset: {
          provider: 'oss',
          role: options.body.role,
          bucket: 'bucket',
          region: 'oss-cn-shanghai',
          objectKey: options.body.objectKey,
          url: `https://assets.example.test/${options.body.objectKey}`,
          width: options.body.width,
          height: options.body.height,
          sizeBytes: 1000,
          contentType: 'image/jpeg',
          uploadedAt: '2026-05-11T00:00:00.000Z',
          variants: []
        }
      });
    }) as unknown as MerchantApiRequester;

    const detail = await uploadMerchantAsset('product-detail', {
      filePath: '/tmp/detail.jpg',
      fileSizeBytes: 1000,
      request
    });
    const banner = await uploadMerchantAsset('runtime-banner', {
      filePath: '/tmp/banner.jpg',
      fileSizeBytes: 1000,
      request
    });

    expect(detail.asset.variants[0]?.url).toBe(
      'https://assets.example.test/key-product-detail?x-oss-process=image/resize,m_lfit,w_720/format,webp/quality,q_78'
    );
    expect(banner.asset.variants[0]?.url).toBe(
      'https://assets.example.test/key-runtime-banner?x-oss-process=image/resize,m_lfit,w_750/format,webp/quality,q_80'
    );
  });
});
