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
      'cloud://cloud1-d6g77eyym7081a1b0.636c-cloud1-d6g77eyym7081a1b0-1422849178/image/浏览商品_v2.png',
      'cloud://cloud1-d6g77eyym7081a1b0.636c-cloud1-d6g77eyym7081a1b0-1422849178/image/购前须知_v2.png',
      'cloud://cloud1-d6g77eyym7081a1b0.636c-cloud1-d6g77eyym7081a1b0-1422849178/image/售前咨询_v2.png',
      'cloud://cloud1-d6g77eyym7081a1b0.636c-cloud1-d6g77eyym7081a1b0-1422849178/image/会员权益_v2.png'
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
        'https://tmp.example.com/cloud%3A%2F%2Fcloud1-d6g77eyym7081a1b0.636c-cloud1-d6g77eyym7081a1b0-1422849178%2Fimage%2F%E6%B5%8F%E8%A7%88%E5%95%86%E5%93%81_v2.png'
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
