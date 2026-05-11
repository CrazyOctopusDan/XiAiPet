import { describe, expect, it } from 'vitest';

import {
  getAssetUrlForVariant,
  isAssetStorageId,
  isOssAssetReference,
  isOssAssetRole,
  isOssAssetVariant
} from './assets';
import type { OssAssetReference } from '../types/assets';

const asset: OssAssetReference = {
  provider: 'oss',
  role: 'product-cover',
  bucket: 'xiaipet-test-assets',
  region: 'oss-cn-shanghai',
  objectKey: 'merchant/m-1/assets/product-cover/2026/id-display.jpg',
  url: 'https://assets.example.test/merchant/m-1/assets/product-cover/2026/id-display.jpg',
  width: 960,
  height: 960,
  sizeBytes: 1000,
  contentType: 'image/jpeg',
  uploadedAt: '2026-05-11T00:00:00.000Z',
  variants: [
    {
      name: 'display',
      objectKey: 'merchant/m-1/assets/product-cover/2026/id-display.jpg',
      url: 'https://assets.example.test/display.jpg',
      width: 960,
      height: 960,
      sizeBytes: 1000,
      contentType: 'image/jpeg'
    },
    {
      name: 'thumbnail',
      objectKey: 'merchant/m-1/assets/product-cover/2026/id-thumbnail.jpg',
      url: 'https://assets.example.test/thumbnail.jpg',
      width: 480,
      height: 480,
      sizeBytes: 500,
      contentType: 'image/jpeg'
    }
  ]
};

describe('asset schema', () => {
  it('recognizes supported OSS roles and variants', () => {
    expect(isOssAssetRole('product-cover')).toBe(true);
    expect(isOssAssetRole('avatar')).toBe(false);
    expect(isOssAssetVariant('thumbnail')).toBe(true);
    expect(isOssAssetVariant('original')).toBe(false);
  });

  it('accepts legacy CloudBase and new OSS storage ids', () => {
    expect(isAssetStorageId('cloud://env/path/file.jpg')).toBe(true);
    expect(isAssetStorageId('oss://xiaipet-test-assets/merchant/m-1/file.jpg')).toBe(true);
    expect(isAssetStorageId('https://assets.example.test/file.jpg')).toBe(false);
  });

  it('validates OSS asset references and resolves variant URLs', () => {
    expect(isOssAssetReference(asset)).toBe(true);
    expect(getAssetUrlForVariant(asset, 'thumbnail')).toBe('https://assets.example.test/thumbnail.jpg');
    expect(getAssetUrlForVariant(asset, 'detail')).toBe(asset.url);
  });
});
