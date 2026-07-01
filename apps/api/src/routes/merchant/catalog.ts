import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

type MerchantProductStatus = 'draft' | 'published' | 'archived';
type MerchantProductSort = 'manual' | 'latest';

function parseMerchantProductStatus(value: unknown): MerchantProductStatus | undefined {
  return value === 'draft' || value === 'published' || value === 'archived' ? value : undefined;
}

function parseMerchantProductSort(value: unknown): MerchantProductSort | undefined {
  return value === 'manual' || value === 'latest' ? value : undefined;
}

function parsePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : undefined;
}

function parseString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function merchantCatalogRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const merchantGuard = { preHandler: dependencies.guards.requireMerchantSession };

  app.get('/categories', merchantGuard, async (request) => {
    return dependencies.catalogService.queryMerchantCategories(request.query as Record<string, unknown>);
  });

  app.put('/categories/:categoryId', merchantGuard, async (request) => {
    const params = request.params as { categoryId: string };
    return dependencies.catalogService.upsertMerchantCategory(request.merchant, params.categoryId, request.body);
  });

  app.post('/categories/reorder', merchantGuard, async (request) => {
    return dependencies.catalogService.reorderMerchantCategories(request.merchant, request.body);
  });

  app.delete('/categories/:categoryId', merchantGuard, async (request) => {
    const params = request.params as { categoryId: string };
    return dependencies.catalogService.deleteMerchantCategory(request.merchant, params.categoryId);
  });

  app.get('/products', merchantGuard, async (request) => {
    const query = request.query as Record<string, unknown>;
    return dependencies.catalogService.queryMerchantProducts({
      categoryId: parseString(query.categoryId),
      status: parseMerchantProductStatus(query.status),
      keyword: parseString(query.keyword),
      sort: parseMerchantProductSort(query.sort),
      limit: parsePositiveInteger(query.limit),
      cursor: parseString(query.cursor)
    });
  });

  app.post('/products/reorder', merchantGuard, async (request) => {
    return dependencies.catalogService.reorderMerchantProducts(request.merchant, request.body);
  });

  app.get('/products/:productId', merchantGuard, async (request) => {
    const params = request.params as { productId: string };
    return dependencies.catalogService.getMerchantProductDetail(params.productId);
  });

  app.put('/products/:productId', merchantGuard, async (request) => {
    const params = request.params as { productId: string };
    return dependencies.catalogService.upsertMerchantProduct(request.merchant, params.productId, request.body);
  });

  app.delete('/products/:productId', merchantGuard, async (request) => {
    const params = request.params as { productId: string };
    return dependencies.catalogService.deleteMerchantProduct(request.merchant, params.productId);
  });
}
