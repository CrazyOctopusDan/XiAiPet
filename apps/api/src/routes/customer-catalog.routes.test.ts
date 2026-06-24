import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { testConfig } from './test-helpers';

describe('customer catalog and runtime config routes', () => {
  it('queries categories, products and runtime config sections', async () => {
    const queryCustomerCategories = vi.fn(async () => ({ ok: true, categories: [{ id: 'cat-1' }] }));
    const queryCustomerProducts = vi.fn(async (filters?: { categoryId?: string }) => ({ ok: true, products: [{ id: 'p1', categoryId: filters?.categoryId }] }));
    const readCustomerRuntimeConfig = vi.fn(async (query?: { sectionKeys?: string[] }) => ({ ok: true, sections: query?.sectionKeys ?? [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        catalogService: {
          queryCustomerCategories,
          queryCustomerProducts,
          queryMerchantCategories: async () => ({ ok: true }),
          upsertMerchantCategory: async () => ({ ok: true }),
          deleteMerchantCategory: async () => ({ ok: true }),
          queryMerchantProducts: async () => ({ ok: true }),
          upsertMerchantProduct: async () => ({ ok: true }),
          deleteMerchantProduct: async () => ({ ok: true }),
          queryCustomerCategoryProducts: async () => ({ ok: true }),
          getCustomerProductDetail: async () => ({ ok: true }),
          searchCustomerProducts: async () => ({ ok: true }),
          getMerchantProductDetail: async () => ({ ok: true })
        },
        runtimeConfigService: {
          parseSectionKeys: (input?: string | string[]) => (Array.isArray(input) ? input : input?.split(',')),
          readCustomerRuntimeConfig,
          getRuntimeConfigSections: async () => ({ ok: true }),
          readMerchantRuntimeConfig: async () => ({ ok: true }),
          upsertRuntimeConfigSection: async () => ({ ok: true })
        }
      }
    });

    expect((await app.inject({ method: 'GET', url: '/api/v1/customer/catalog/categories' })).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: 'GET', url: '/api/v1/customer/catalog/products?categoryId=cat-1' })).json()).toMatchObject({ products: [{ categoryId: 'cat-1' }] });
    expect((await app.inject({ method: 'GET', url: '/api/v1/customer/runtime-config?sectionKeys=banner,store-profile' })).json()).toMatchObject({ sections: ['banner', 'store-profile'] });
    expect(queryCustomerCategories).toHaveBeenCalled();
    expect(queryCustomerProducts).toHaveBeenCalledWith({ categoryId: 'cat-1' });
    expect(readCustomerRuntimeConfig).toHaveBeenCalledWith({ sectionKeys: ['banner', 'store-profile'] });
  });

  it('routes customer category product paging with parsed filters', async () => {
    const queryCustomerCategoryProducts = vi.fn(async () => ({ ok: true, items: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        catalogService: {
          queryCustomerCategories: async () => ({ ok: true }),
          queryCustomerProducts: async () => ({ ok: true }),
          queryCustomerCategoryProducts,
          getCustomerProductDetail: async () => ({ ok: true }),
          searchCustomerProducts: async () => ({ ok: true }),
          queryMerchantCategories: async () => ({ ok: true }),
          upsertMerchantCategory: async () => ({ ok: true }),
          deleteMerchantCategory: async () => ({ ok: true }),
          queryMerchantProducts: async () => ({ ok: true }),
          getMerchantProductDetail: async () => ({ ok: true }),
          upsertMerchantProduct: async () => ({ ok: true }),
          deleteMerchantProduct: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/catalog/categories/cakes/products?deliveryMode=delivery&availability=soldOut&keyword=%E5%8D%97%E7%93%9C&sort=latest&limit=6'
    });

    expect(response.statusCode).toBe(200);
    expect(queryCustomerCategoryProducts).toHaveBeenCalledWith({
      categoryId: 'cakes',
      deliveryMode: 'delivery',
      availability: 'soldOut',
      keyword: '南瓜',
      sort: 'latest',
      limit: 6,
      cursor: undefined
    });
  });

  it('routes customer product detail by product id', async () => {
    const getCustomerProductDetail = vi.fn(async () => ({ ok: true, product: { id: 'pumpkin-cake' } }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        catalogService: {
          queryCustomerCategories: async () => ({ ok: true }),
          queryCustomerProducts: async () => ({ ok: true }),
          queryCustomerCategoryProducts: async () => ({ ok: true }),
          getCustomerProductDetail,
          searchCustomerProducts: async () => ({ ok: true }),
          queryMerchantCategories: async () => ({ ok: true }),
          upsertMerchantCategory: async () => ({ ok: true }),
          deleteMerchantCategory: async () => ({ ok: true }),
          queryMerchantProducts: async () => ({ ok: true }),
          getMerchantProductDetail: async () => ({ ok: true }),
          upsertMerchantProduct: async () => ({ ok: true }),
          deleteMerchantProduct: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/catalog/products/pumpkin-cake'
    });

    expect(response.statusCode).toBe(200);
    expect(getCustomerProductDetail).toHaveBeenCalledWith('pumpkin-cake');
  });

  it('routes customer catalog search with parsed params', async () => {
    const searchCustomerProducts = vi.fn(async () => ({ ok: true, items: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        catalogService: {
          queryCustomerCategories: async () => ({ ok: true }),
          queryCustomerProducts: async () => ({ ok: true }),
          queryCustomerCategoryProducts: async () => ({ ok: true }),
          getCustomerProductDetail: async () => ({ ok: true }),
          searchCustomerProducts,
          queryMerchantCategories: async () => ({ ok: true }),
          upsertMerchantCategory: async () => ({ ok: true }),
          deleteMerchantCategory: async () => ({ ok: true }),
          queryMerchantProducts: async () => ({ ok: true }),
          getMerchantProductDetail: async () => ({ ok: true }),
          upsertMerchantProduct: async () => ({ ok: true }),
          deleteMerchantProduct: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customer/catalog/products/search?keyword=%E5%8D%97%E7%93%9C&limit=20'
    });

    expect(response.statusCode).toBe(200);
    expect(searchCustomerProducts).toHaveBeenCalledWith({
      keyword: '南瓜',
      deliveryMode: undefined,
      limit: 20,
      cursor: undefined
    });
  });

  it('routes customer cart line resolution to the catalog service', async () => {
    const resolveCustomerCartLines = vi.fn(async () => ({
      ok: true,
      lines: [
        {
          productId: 'ocean-party',
          requestedSpecId: '6-inch__salmon',
          resolvedSpecId: '6-inch__salmon',
          status: 'available',
          requestedQuantity: 2,
          resolvedQuantity: 2,
          changes: []
        }
      ]
    }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        catalogService: {
          queryCustomerCategories: async () => ({ ok: true }),
          queryCustomerProducts: async () => ({ ok: true }),
          queryCustomerCategoryProducts: async () => ({ ok: true }),
          getCustomerProductDetail: async () => ({ ok: true }),
          searchCustomerProducts: async () => ({ ok: true }),
          resolveCustomerCartLines,
          queryMerchantCategories: async () => ({ ok: true }),
          upsertMerchantCategory: async () => ({ ok: true }),
          deleteMerchantCategory: async () => ({ ok: true }),
          queryMerchantProducts: async () => ({ ok: true }),
          getMerchantProductDetail: async () => ({ ok: true }),
          upsertMerchantProduct: async () => ({ ok: true }),
          deleteMerchantProduct: async () => ({ ok: true })
        } as any
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/catalog/cart/resolve',
      payload: {
        lines: [
          {
            productId: 'ocean-party',
            specId: '6-inch__salmon',
            quantity: 2
          }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      lines: [
        {
          productId: 'ocean-party',
          status: 'available'
        }
      ]
    });
    expect(resolveCustomerCartLines).toHaveBeenCalledWith({
      lines: [
        {
          productId: 'ocean-party',
          specId: '6-inch__salmon',
          quantity: 2
        }
      ]
    });
  });
});
