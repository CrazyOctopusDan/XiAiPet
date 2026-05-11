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
          queryMerchantProducts: async () => ({ ok: true }),
          upsertMerchantProduct: async () => ({ ok: true })
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
});
