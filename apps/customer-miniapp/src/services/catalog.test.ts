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
      '/assets/catalog/浏览商品_v3.jpg',
      '/assets/catalog/购前须知_3.jpg',
      '/assets/catalog/售前咨询_v3.jpg',
      '/assets/catalog/会员权益_v3.jpg'
    ]);
  });

  it('resolves home module cloud image file ids into displayable image urls', async () => {
    const resolvedModules = await resolveHomeModuleImageSources(async (fileIds) =>
      Object.fromEntries(fileIds.map((fileId) => [fileId, `https://tmp.example.com/${encodeURIComponent(fileId)}`]))
    );

    expect(resolvedModules).toHaveLength(4);
    expect(resolvedModules[0]).toMatchObject({
      title: '浏览商品',
      imageSrc:
        'https://tmp.example.com/%2Fassets%2Fcatalog%2F%E6%B5%8F%E8%A7%88%E5%95%86%E5%93%81_v3.jpg'
    });
    expect(resolvedModules[1]).toMatchObject({
      title: '购前须知',
      imageSrc:
        'https://tmp.example.com/%2Fassets%2Fcatalog%2F%E8%B4%AD%E5%89%8D%E9%A1%BB%E7%9F%A5_3.jpg'
    });
    expect(resolvedModules[2]).toMatchObject({
      title: '售前咨询',
      imageSrc:
        'https://tmp.example.com/%2Fassets%2Fcatalog%2F%E5%94%AE%E5%89%8D%E5%92%A8%E8%AF%A2_v3.jpg'
    });
    expect(resolvedModules[3]).toMatchObject({
      title: '会员权益',
      imageSrc:
        'https://tmp.example.com/%2Fassets%2Fcatalog%2F%E4%BC%9A%E5%91%98%E6%9D%83%E7%9B%8A_v3.jpg'
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
              thumbnail: '',
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

  it('normalizes merchant-shaped catalog API records before rendering customer sections', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories') {
        return {
          ok: true,
          categories: [
            {
              id: 'category-1778893800973',
              name: '娜塔莎',
              iconToken: '塔',
              sortOrder: 0,
              createdAt: '2026-05-16T00:00:00.000Z',
              updatedAt: '2026-05-16T00:00:00.000Z'
            }
          ]
        };
      }
      if (path === '/api/v1/customer/catalog/products') {
        return {
          ok: true,
          products: [
            {
              id: 'natasha-cake',
              name: '娜塔莎蛋糕',
              description: '后台商品描述',
              detailContent: '用户端详情',
              categoryId: 'category-1778893800973',
              imageFileId: '',
              imagePreviewUrl: '',
              memberLevelId: null,
              status: 'published',
              stock: 5,
              trackInventory: true,
              fulfillmentModes: ['delivery'],
              basePrice: 168,
              specs: [{ id: 'small', label: '小份', surcharge: 20 }],
              formulas: [],
              priceOverrides: [],
              purchaseLimit: { enabled: false, maxQuantity: null },
              createdAt: '2026-05-16T00:00:00.000Z',
              updatedAt: '2026-05-16T00:00:00.000Z'
            }
          ]
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await hydrateCatalog(apiRequest as Parameters<typeof hydrateCatalog>[0]);

    expect(getCatalogCategories()).toEqual([
      expect.objectContaining({
        id: 'category-1778893800973',
        name: '娜塔莎',
        shortName: '娜塔莎',
        iconText: '塔',
        sectionTitle: '娜塔莎'
      })
    ]);
    expect(buildCatalogSections('delivery')[0]).toMatchObject({
      category: expect.objectContaining({ id: 'category-1778893800973' }),
      availableProducts: [
        expect.objectContaining({
          id: 'natasha-cake',
          name: '娜塔莎蛋糕',
          summary: '后台商品描述',
          description: '用户端详情',
          price: 168,
          deliveryModes: ['delivery'],
          specs: [{ id: 'small', label: '小份', price: 188 }]
        })
      ]
    });
  });

  it('keeps merchant products visible when old records have no fulfillment modes', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories') {
        return {
          ok: true,
          categories: [
            {
              id: 'legacy-category',
              name: '历史商品',
              iconToken: '旧'
            }
          ]
        };
      }
      if (path === '/api/v1/customer/catalog/products') {
        return {
          ok: true,
          products: [
            {
              id: 'legacy-cake',
              name: '历史蛋糕',
              description: '早期保存的商品',
              categoryId: 'legacy-category',
              imageFileId: '',
              stock: 3,
              trackInventory: true,
              fulfillmentModes: [],
              basePrice: 88,
              specs: []
            }
          ]
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await hydrateCatalog(apiRequest as Parameters<typeof hydrateCatalog>[0]);

    expect(buildCatalogSections('delivery')[0]?.availableProducts[0]).toMatchObject({
      id: 'legacy-cake',
      deliveryModes: ['pickup', 'delivery', 'express']
    });
    expect(buildCatalogSections('pickup')[0]?.availableProducts[0]?.id).toBe('legacy-cake');
    expect(buildCatalogSections('express')[0]?.availableProducts[0]?.id).toBe('legacy-cake');
  });

  it('renders all matching published products from raw catalog API records', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories') {
        return {
          ok: true,
          categories: [
            { id: 'cakes', name: '宠物蛋糕', iconToken: '糕' },
            { id: 'cat-cakes', name: 'Pet Cakes', iconToken: 'CAKE' },
            { id: 'cat-snacks', name: 'Pet Snacks', iconToken: 'BONE' }
          ]
        };
      }
      if (path === '/api/v1/customer/catalog/products') {
        return {
          ok: true,
          products: [
            {
              id: 'ocean-party',
              name: '海洋派对生日蛋糕',
              description: '生日预约款宠物蛋糕。',
              categoryId: 'cakes',
              imagePreviewUrl: 'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/ocean-party.png',
              status: 'PUBLISHED',
              stock: 12,
              trackInventory: true,
              fulfillmentModes: ['delivery', 'pickup'],
              basePrice: '168.00',
              specs: [{ id: '4-inch', label: '4 寸', surcharge: 0 }],
              formulas: [{ id: 'chicken', label: '鸡肉南瓜', surcharge: 0 }],
              priceOverrides: []
            },
            {
              id: 'prod-birthday-cake',
              name: 'Birthday Cake',
              description: 'Local birthday cake seed product.',
              categoryId: 'cat-cakes',
              imagePreviewUrl: 'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/prod-birthday-cake.png',
              status: 'PUBLISHED',
              stock: 12,
              trackInventory: true,
              fulfillmentModes: ['delivery', 'pickup'],
              basePrice: '168.00',
              specs: [{ id: '4-inch', label: '4 inch', surcharge: 0 }],
              formulas: [{ id: 'chicken', label: 'Chicken', surcharge: 0 }],
              priceOverrides: []
            },
            {
              id: 'prod-paw-cookie',
              name: 'Paw Cookie',
              description: 'Local snack seed product.',
              categoryId: 'cat-snacks',
              imagePreviewUrl: 'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/prod-paw-cookie.png',
              status: 'PUBLISHED',
              stock: 50,
              trackInventory: true,
              fulfillmentModes: ['pickup', 'express'],
              basePrice: '38.00',
              specs: []
            },
            {
              id: 'sea-sponge',
              name: '海盐芝士小方',
              description: '适合小型犬猫的低糖烘焙点心。',
              categoryId: 'cakes',
              imagePreviewUrl: 'https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/sea-sponge.png',
              status: 'PUBLISHED',
              stock: 30,
              trackInventory: true,
              fulfillmentModes: ['delivery', 'pickup', 'express'],
              basePrice: '68.00',
              specs: []
            }
          ]
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await hydrateCatalog(apiRequest as Parameters<typeof hydrateCatalog>[0]);

    expect(buildCatalogSections('delivery').flatMap((section) => section.availableProducts.map((product) => product.id))).toEqual([
      'ocean-party',
      'sea-sponge',
      'prod-birthday-cake'
    ]);
    expect(buildCatalogSections('pickup').flatMap((section) => section.availableProducts.map((product) => product.id))).toEqual([
      'ocean-party',
      'sea-sponge',
      'prod-birthday-cake',
      'prod-paw-cookie'
    ]);
    expect(getProductDisplayPrice(getProductById('prod-birthday-cake')!, '4-inch')).toBe(168);
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

  it('adds https before rendering protocol-less remote product image URLs', () => {
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
      thumbnail: 'xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/prod-birthday-cake.png',
      gallery: ['xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/display.jpg'],
      detailImages: ['http://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/detail.jpg'],
      specs: []
    });

    expect(product.thumbnail).toBe('https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/prod-birthday-cake.png');
    expect(product.gallery).toEqual(['https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/display.jpg']);
    expect(product.detailImages).toEqual(['https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com/catalog/detail.jpg']);
  });

  it('uses the default local detail long image when a remote product has no detail images', async () => {
    const apiRequest = vi.fn((path: string) => {
      if (path.includes('/categories')) {
        return Promise.resolve({
          categories: [
            {
              id: 'cakes',
              name: '蛋糕',
              iconText: '糕',
              sectionTitle: '蛋糕'
            }
          ]
        });
      }

      return Promise.resolve({
        products: [
          {
            id: 'plain-cake',
            name: '基础蛋糕',
            categoryId: 'cakes',
            description: '无详情长图',
            basePrice: 88,
            stock: 5,
            fulfillmentModes: ['delivery'],
            imageFileId: '',
            imagePreviewUrl: '',
            detailImages: []
          }
        ]
      });
    });

    await hydrateCatalog(apiRequest as Parameters<typeof hydrateCatalog>[0]);

    expect(getProductById('plain-cake')?.detailImages).toEqual([]);
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
