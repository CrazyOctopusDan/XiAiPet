import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCatalogSections,
  getCatalogCategories,
  getProductDisplayPrice,
  getHomeModules,
  getProductById,
  getProductSelectedSpecLabel,
  hydrateCatalog,
  resetCatalogCache,
  resolveCatalogProductAssetUrls,
  resolveHomeModuleImageSources,
  resolveProductSpec,
  searchProducts
} from './catalog';

describe('catalog service', () => {
  beforeEach(() => {
    resetCatalogCache();
  });

  it('builds delivery sections with available and sold-out products separated', () => {
    const sections = buildCatalogSections('delivery');
    const soldOutNames = sections.flatMap((section) =>
      section.soldOutProducts.map((product) => product.name)
    );

    expect(sections[0]?.category.name).toBe('蛋糕｜定制系列');
    expect(sections[0]?.availableProducts.map((product) => product.name)).toContain('椰椰浪屿');
    expect(soldOutNames).toContain('海苔肉脯');
  });

  it('searches products by keyword across name and summary', () => {
    expect(searchProducts('海')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '海绵宝宝' }),
        expect.objectContaining({ name: '海洋奇遇' })
      ])
    );
    expect(searchProducts('不存在')).toEqual([]);
  });

  it('returns product detail and home modules from mock catalog content', () => {
    expect(getProductById('ocean-party')?.name).toBe('海洋奇遇');
    expect(getHomeModules().map((item) => item.title)).toEqual([
      '浏览商品',
      '购前须知',
      '售前咨询',
      '会员权益'
    ]);
    expect(getHomeModules().map((item) => item.imageFileId)).toEqual([
      '/assets/catalog/catalog-reference.png',
      '/assets/catalog/detail-reference.png',
      '/assets/catalog/search-reference.png',
      '/assets/catalog/home-hero.png'
    ]);
  });

  it('resolves home module cloud image file ids into displayable image urls', async () => {
    const resolvedModules = await resolveHomeModuleImageSources(async (fileIds) =>
      Object.fromEntries(fileIds.map((fileId) => [fileId, `https://tmp.example.com/${encodeURIComponent(fileId)}`]))
    );

    expect(resolvedModules).toHaveLength(4);
    expect(resolvedModules[0]).toMatchObject({
      title: '浏览商品',
      imageSrc: 'https://tmp.example.com/%2Fassets%2Fcatalog%2Fcatalog-reference.png'
    });
    expect(resolvedModules[3]).toMatchObject({
      title: '会员权益'
    });
  });

  it('resolves selected spec price and label for spec products', () => {
    const product = getProductById('ocean-party');

    if (!product) {
      throw new Error('missing product fixture');
    }

    expect(resolveProductSpec(product, 'missing-spec')?.id).toBe(product.specs[0]?.id);
    expect(getProductDisplayPrice(product, 'ocean-party-4-duck')).toBe(168);
    expect(getProductSelectedSpecLabel(product, 'ocean-party-4-dog-heart')).toBe('4寸 狗狗夹心坯');
  });

  it('hydrates customer catalog from the HTTP categories and products APIs', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories') {
        return {
          ok: true,
          categories: [
            {
              id: 'fresh',
              name: '今日新品',
              shortName: '今日新品',
              iconText: '新',
              sectionTitle: '新鲜上架'
            }
          ]
        };
      }
      if (path === '/api/v1/customer/catalog/products') {
        return {
          ok: true,
          products: [
            {
              id: 'fresh-cake',
              name: '鲜奶小蛋糕',
              summary: '今日制作',
              description: '适合小型庆生',
              price: 128,
              stock: 3,
              soldOut: false,
              cartActionLabel: '直接加购',
              memberLevelLabel: '普通会员可购',
              categoryId: 'fresh',
              deliveryModes: ['pickup', 'delivery'],
              thumbnail: '/assets/catalog/product-card-reference.png',
              gallery: [],
              detailImages: [],
              specs: []
            }
          ]
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const catalog = await hydrateCatalog(apiRequest as Parameters<typeof hydrateCatalog>[0]);

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/catalog/categories', {
      method: 'GET',
      auth: 'none'
    });
    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/catalog/products', {
      method: 'GET',
      auth: 'none'
    });
    expect(catalog.categories).toHaveLength(1);
    expect(getCatalogCategories()[0]?.name).toBe('今日新品');
    expect(buildCatalogSections('delivery')[0]?.availableProducts[0]?.name).toBe('鲜奶小蛋糕');
  });

  it('resolves OSS product asset references to role-specific display URLs', () => {
    const product = resolveCatalogProductAssetUrls({
      id: 'asset-cake',
      name: '资产蛋糕',
      summary: 'OSS',
      description: 'OSS',
      price: 128,
      stock: 1,
      soldOut: false,
      cartActionLabel: '直接加购',
      memberLevelLabel: '普通会员可购',
      categoryId: 'cakes',
      deliveryModes: ['delivery'],
      thumbnail: 'oss://bucket/legacy-cover.jpg',
      imageAsset: {
        provider: 'oss',
        role: 'product-cover',
        bucket: 'bucket',
        region: 'oss-cn-shanghai',
        objectKey: 'cover-display.jpg',
        url: 'https://assets.example.test/cover-display.jpg',
        width: 960,
        height: 960,
        sizeBytes: 1000,
        contentType: 'image/jpeg',
        uploadedAt: '2026-05-11T00:00:00.000Z',
        variants: [
          {
            name: 'thumbnail',
            objectKey: 'cover-thumbnail.jpg',
            url: 'https://assets.example.test/cover-thumbnail.jpg',
            width: 480,
            height: 480,
            sizeBytes: 500,
            contentType: 'image/jpeg'
          }
        ]
      },
      gallery: [],
      introductionImageAssets: [
        {
          provider: 'oss',
          role: 'product-introduction',
          bucket: 'bucket',
          region: 'oss-cn-shanghai',
          objectKey: 'intro-display.jpg',
          url: 'https://assets.example.test/intro-display.jpg',
          width: 960,
          height: 720,
          sizeBytes: 1000,
          contentType: 'image/jpeg',
          uploadedAt: '2026-05-11T00:00:00.000Z',
          variants: []
        }
      ],
      detailImages: [],
      detailImageAssets: [
        {
          provider: 'oss',
          role: 'product-detail',
          bucket: 'bucket',
          region: 'oss-cn-shanghai',
          objectKey: 'detail.jpg',
          url: 'https://assets.example.test/detail.jpg',
          width: 960,
          height: 1280,
          sizeBytes: 1000,
          contentType: 'image/jpeg',
          uploadedAt: '2026-05-11T00:00:00.000Z',
          variants: []
        }
      ],
      specs: []
    });

    expect(product.thumbnail).toBe('https://assets.example.test/cover-thumbnail.jpg');
    expect(product.gallery).toEqual(['https://assets.example.test/intro-display.jpg']);
    expect(product.detailImages).toEqual(['https://assets.example.test/detail.jpg']);
  });

  it('keeps local fallback catalog content when remote sections are missing', async () => {
    await hydrateCatalog(
      vi.fn().mockResolvedValue({
        ok: true
      })
    );

    expect(getCatalogCategories()[0]?.name).toBe('蛋糕｜定制系列');
    expect(getProductById('ocean-party')?.name).toBe('海洋奇遇');
  });
});
