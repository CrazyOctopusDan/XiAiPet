import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCatalogSections,
  getCatalogSectionState,
  getCatalogCategories,
  getProductDisplayPrice,
  getHomeModules,
  getProductById,
  getProductSelectedSpecLabel,
  getProductDetail,
  hydrateCatalog,
  hydrateCatalogCategories,
  loadCategoryProducts,
  resetCatalogCache,
  resolveCatalogProductAssetUrls,
  resolveHomeModuleImageSources,
  resolveProductSpec,
  searchCatalogProducts,
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
      '/assets/catalog/浏览商品_v3.png',
      '/assets/catalog/购前须知_3.png',
      '/assets/catalog/售前咨询_v3.png',
      '/assets/catalog/会员权益_v3.png'
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
        'https://tmp.example.com/%2Fassets%2Fcatalog%2F%E6%B5%8F%E8%A7%88%E5%95%86%E5%93%81_v3.png'
    });
    expect(resolvedModules[1]).toMatchObject({
      title: '购前须知',
      imageSrc:
        'https://tmp.example.com/%2Fassets%2Fcatalog%2F%E8%B4%AD%E5%89%8D%E9%A1%BB%E7%9F%A5_3.png'
    });
    expect(resolvedModules[2]).toMatchObject({
      title: '售前咨询',
      imageSrc:
        'https://tmp.example.com/%2Fassets%2Fcatalog%2F%E5%94%AE%E5%89%8D%E5%92%A8%E8%AF%A2_v3.png'
    });
    expect(resolvedModules[3]).toMatchObject({
      title: '会员权益',
      imageSrc:
        'https://tmp.example.com/%2Fassets%2Fcatalog%2F%E4%BC%9A%E5%91%98%E6%9D%83%E7%9B%8A_v3.png'
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

  it('hydrates categories without requesting all products and initializes empty section state', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/categories?deliveryMode=delivery') {
        return {
          ok: true,
          snapshotKey: 'delivery-categories-1',
          categories: [
            {
              id: 'cakes',
              name: '蛋糕',
              shortName: '蛋糕',
              iconText: '糕',
              sectionTitle: '蛋糕',
              availableCount: 12,
              soldOutCount: 2,
              previewCount: 12,
              firstProductUpdatedAt: '2026-06-01T00:00:00.000Z'
            }
          ]
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await hydrateCatalogCategories('delivery', apiRequest as Parameters<typeof hydrateCatalogCategories>[1]);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/api/v1/customer/catalog/categories?deliveryMode=delivery', {
      method: 'GET',
      auth: 'none'
    });
    expect(apiRequest).not.toHaveBeenCalledWith('/api/v1/customer/catalog/products', expect.anything());
    expect(getCatalogCategories()[0]).toMatchObject({
      id: 'cakes',
      availableCount: 12,
      soldOutCount: 2
    });
    expect(getCatalogSectionState('delivery', 'cakes')).toMatchObject({
      availableProducts: [],
      soldOutProducts: [],
      availablePageInfo: { hasMore: false, nextCursor: null },
      soldOutPageInfo: { hasMore: false, nextCursor: null }
    });
  });

  it('loads available and sold-out category pages separately into section state', async () => {
    const apiRequest = vi.fn(async (path: string) => ({
      ok: true,
      categoryId: 'cakes',
      availability: path.includes('availability=soldOut') ? 'soldOut' : 'available',
      items: [
        {
          id: path.includes('availability=soldOut') ? 'sold-out-cake' : 'fresh-cake',
          name: '蛋糕',
          summary: '低糖',
          categoryId: 'cakes',
          minPrice: 88,
          stock: path.includes('availability=soldOut') ? 0 : 1,
          soldOut: path.includes('availability=soldOut'),
          cartActionLabel: '直接加购',
          memberLevelLabel: '普通会员可购',
          thumbnail: '',
          updatedAt: '2026-06-01T00:00:00.000Z'
        }
      ],
      pageInfo: { hasMore: false, nextCursor: null },
      snapshotKey: 'cakes-page'
    }));

    await hydrateCatalogCategories(
      'delivery',
      vi.fn().mockResolvedValue({
        ok: true,
        categories: [{ id: 'cakes', name: '蛋糕', availableCount: 1, soldOutCount: 1 }]
      }) as Parameters<typeof hydrateCatalogCategories>[1]
    );
    await loadCategoryProducts(
      { deliveryMode: 'delivery', categoryId: 'cakes', availability: 'available' },
      apiRequest as Parameters<typeof loadCategoryProducts>[1]
    );
    await loadCategoryProducts(
      { deliveryMode: 'delivery', categoryId: 'cakes', availability: 'soldOut' },
      apiRequest as Parameters<typeof loadCategoryProducts>[1]
    );

    const section = getCatalogSectionState('delivery', 'cakes');
    expect(section.availableProducts.map((item) => item.id)).toEqual(['fresh-cake']);
    expect(section.soldOutProducts.map((item) => item.id)).toEqual(['sold-out-cake']);
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/customer/catalog/categories/cakes/products?deliveryMode=delivery&availability=available&limit=12',
      { method: 'GET', auth: 'none' }
    );
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/customer/catalog/categories/cakes/products?deliveryMode=delivery&availability=soldOut&limit=12',
      { method: 'GET', auth: 'none' }
    );
  });

  it('appends category product pages and updates pageInfo when loading with a cursor', async () => {
    const apiRequest = vi.fn(async (path: string) => ({
      ok: true,
      categoryId: 'cakes',
      availability: 'available',
      items: [
        {
          id: path.includes('cursor=page-2') ? 'second-cake' : 'first-cake',
          name: path.includes('cursor=page-2') ? '第二页蛋糕' : '第一页蛋糕',
          summary: '低糖',
          categoryId: 'cakes',
          minPrice: 88,
          stock: 1,
          soldOut: false,
          cartActionLabel: '直接加购',
          memberLevelLabel: '普通会员可购',
          thumbnail: '',
          updatedAt: '2026-06-01T00:00:00.000Z'
        }
      ],
      pageInfo: path.includes('cursor=page-2')
        ? { hasMore: false, nextCursor: null }
        : { hasMore: true, nextCursor: 'page-2' },
      snapshotKey: 'cakes-page'
    }));

    await hydrateCatalogCategories(
      'delivery',
      vi.fn().mockResolvedValue({ ok: true, categories: [{ id: 'cakes', name: '蛋糕' }] }) as Parameters<
        typeof hydrateCatalogCategories
      >[1]
    );
    await loadCategoryProducts(
      { deliveryMode: 'delivery', categoryId: 'cakes', availability: 'available' },
      apiRequest as Parameters<typeof loadCategoryProducts>[1]
    );
    const nextCursor = getCatalogSectionState('delivery', 'cakes').availablePageInfo.nextCursor;
    await loadCategoryProducts(
      { deliveryMode: 'delivery', categoryId: 'cakes', availability: 'available', cursor: nextCursor ?? undefined },
      apiRequest as Parameters<typeof loadCategoryProducts>[1]
    );

    const section = getCatalogSectionState('delivery', 'cakes');
    expect(section.availableProducts.map((item) => item.id)).toEqual(['first-cake', 'second-cake']);
    expect(section.availablePageInfo).toEqual({ hasMore: false, nextCursor: null });
    expect(apiRequest).toHaveBeenLastCalledWith(
      '/api/v1/customer/catalog/categories/cakes/products?deliveryMode=delivery&availability=available&limit=12&cursor=page-2',
      { method: 'GET', auth: 'none' }
    );
  });

  it('searches catalog products through the service-side search route without local full-product cache', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/products/search?keyword=%E5%8D%97%E7%93%9C&deliveryMode=delivery&limit=20') {
        return {
          ok: true,
          items: [
            {
              id: 'pumpkin-cake',
              name: '南瓜蛋糕',
              summary: '低糖',
              categoryId: 'cakes',
              minPrice: 88,
              stock: 3,
              soldOut: false,
              cartActionLabel: '直接加购',
              memberLevelLabel: '普通会员可购',
              thumbnail: 'assets.example.test/pumpkin.jpg',
              updatedAt: '2026-06-01T00:00:00.000Z'
            }
          ],
          pageInfo: { hasMore: true, nextCursor: 'next-search' },
          snapshotKey: 'search-1'
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    resetCatalogCache({ useLocalFixtures: false });

    const response = await searchCatalogProducts(
      { keyword: '南瓜', deliveryMode: 'delivery' },
      apiRequest as Parameters<typeof searchCatalogProducts>[1]
    );

    expect(response.items).toEqual([
      expect.objectContaining({
        id: 'pumpkin-cake',
        price: 88,
        thumbnail: 'https://assets.example.test/pumpkin.jpg'
      })
    ]);
    expect(response.pageInfo).toEqual({ hasMore: true, nextCursor: 'next-search' });
    expect(searchProducts('南瓜')).toEqual([]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('fetches product detail from the detail endpoint and caches it by productId', async () => {
    const apiRequest = vi.fn(async (path: string) => {
      if (path === '/api/v1/customer/catalog/products/pumpkin-cake') {
        return {
          ok: true,
          product: {
            id: 'pumpkin-cake',
            name: '南瓜蛋糕',
            description: '详情描述',
            detailContent: '详情长文',
            categoryId: 'cakes',
            imagePreviewUrl: '',
            stock: 3,
            trackInventory: true,
            fulfillmentModes: ['delivery'],
            basePrice: 88,
            specs: [{ id: 'small', label: '小份', surcharge: 10 }],
            detailImages: ['assets.example.test/detail.jpg']
          }
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    resetCatalogCache({ useLocalFixtures: false });

    const first = await getProductDetail('pumpkin-cake', apiRequest as Parameters<typeof getProductDetail>[1]);
    const second = await getProductDetail('pumpkin-cake', apiRequest as Parameters<typeof getProductDetail>[1]);

    if (!first) {
      throw new Error('missing product detail');
    }

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({
      id: 'pumpkin-cake',
      description: '详情长文',
      price: 88,
      specs: [{ id: 'small', label: '小份', price: 98 }]
    });
    expect(first.detailImages).toEqual(['https://assets.example.test/detail.jpg']);
    expect(second).toEqual(first);
    expect(getProductById('pumpkin-cake')).toEqual(first);
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

    expect(product.thumbnail).toBe('https://assets.example.test/cover-thumbnail.jpg?x-oss-process=image/resize,m_fill,w_360,h_360/format,webp/quality,q_76');
    expect(product.gallery).toEqual(['https://assets.example.test/intro-display.jpg?x-oss-process=image/resize,m_fill,w_750,h_670/format,webp/quality,q_80']);
    expect(product.detailImages).toEqual(['https://assets.example.test/detail.jpg?x-oss-process=image/resize,m_lfit,w_720/format,webp/quality,q_78']);
  });

  it('keeps compact thumbnails for lists while exposing display images for quick-buy panels', () => {
    const product = resolveCatalogProductAssetUrls({
      id: 'asset-cake',
      name: '资产蛋糕',
      summary: 'OSS',
      description: 'OSS',
      price: 128,
      stock: 1,
      soldOut: false,
      cartActionLabel: '选规格',
      memberLevelLabel: '普通会员可购',
      categoryId: 'cakes',
      deliveryModes: ['delivery'],
      thumbnail: '',
      imageAsset: {
        provider: 'oss',
        role: 'product-cover',
        bucket: 'bucket',
        region: 'oss-cn-shanghai',
        objectKey: 'cover.jpg',
        url: 'https://assets.example.test/cover.jpg',
        width: 720,
        height: 720,
        sizeBytes: 1000,
        contentType: 'image/jpeg',
        uploadedAt: '2026-05-11T00:00:00.000Z',
        variants: [
          {
            name: 'thumbnail',
            objectKey: 'cover.jpg',
            url: 'https://assets.example.test/cover.jpg?x-oss-process=image/resize,m_fill,w_360,h_360/format,webp/quality,q_76',
            width: 360,
            height: 360,
            sizeBytes: 500,
            contentType: 'image/jpeg'
          },
          {
            name: 'display',
            objectKey: 'cover.jpg',
            url: 'https://assets.example.test/cover.jpg?x-oss-process=image/resize,m_fill,w_720,h_720/format,webp/quality,q_80',
            width: 720,
            height: 720,
            sizeBytes: 1000,
            contentType: 'image/jpeg'
          }
        ]
      },
      gallery: [],
      detailImages: [],
      specs: [{ id: '4-inch', label: '4 inch', price: 128 }]
    });

    expect(product.thumbnail).toContain('w_360,h_360');
    expect(product.quickBuyImage).toContain('w_720,h_720');
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

  it('starts with an empty catalog outside tests so local fixture products are not shown to customers', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    try {
      const productionCatalog = await import('./catalog');

      productionCatalog.resetCatalogCache();

      expect(productionCatalog.getCatalogCategories()).toEqual([]);
      expect(productionCatalog.buildCatalogSections('delivery')).toEqual([]);
      expect(productionCatalog.getProductById('ocean-party')).toBeNull();
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
