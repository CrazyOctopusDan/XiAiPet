import { describe, expect, it } from 'vitest';

import {
  createAssetReferenceMigrationReport,
  renderAssetReferenceMigrationReport
} from './asset-reference-migration';

describe('asset reference migration report', () => {
  it('detects CloudBase product and runtime banner image references', () => {
    const report = createAssetReferenceMigrationReport(
      {
        products: [
          {
            id: 'cake-1',
            imageFileId: 'cloud://env/products/cake-1/cover.png',
            introductionImages: ['cloud://env/products/cake-1/intro.jpg'],
            detailImages: [{ fileId: 'cloud://env/products/cake-1/detail.jpg' }]
          }
        ],
        runtimeConfigs: [
          {
            id: 'banner',
            value: {
              fileId: 'cloud://env/runtime/banner.jpg'
            }
          }
        ]
      },
      {
        merchantId: 'm1',
        generatedAt: new Date('2026-05-11T00:00:00.000Z')
      }
    );

    expect(report.candidates).toHaveLength(4);
    expect(report.candidates[0]).toMatchObject({
      sourceCollection: 'products',
      sourceRecordId: 'cake-1',
      fieldPath: 'imageFileId',
      role: 'product-cover',
      targets: [
        { variantName: 'thumbnail', objectKey: 'merchant/m1/assets/product-cover/2026/cake-1-thumbnail.png' },
        { variantName: 'display', objectKey: 'merchant/m1/assets/product-cover/2026/cake-1-display.png' }
      ]
    });
    expect(report.candidates[3]).toMatchObject({
      sourceCollection: 'runtimeConfigs',
      role: 'runtime-banner',
      targets: [{ variantName: 'banner' }]
    });
  });

  it('renders a markdown report and counts skipped references', () => {
    const report = createAssetReferenceMigrationReport(
      {
        products: [
          {
            id: 'cake-1',
            imageFileId: 'oss://bucket/products/cake-1/cover.jpg'
          },
          {
            id: 'cake-2'
          }
        ]
      },
      {
        generatedAt: new Date('2026-05-11T00:00:00.000Z')
      }
    );
    const markdown = renderAssetReferenceMigrationReport(report);

    expect(report.skippedAlreadyOss).toBe(1);
    expect(report.skippedEmpty).toBeGreaterThan(0);
    expect(markdown).toContain('# OSS 资产迁移报告');
    expect(markdown).toContain('已是 OSS 引用并跳过：1');
  });
});
