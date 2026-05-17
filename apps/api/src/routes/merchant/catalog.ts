import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

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

  app.delete('/categories/:categoryId', merchantGuard, async (request) => {
    const params = request.params as { categoryId: string };
    return dependencies.catalogService.deleteMerchantCategory(request.merchant, params.categoryId);
  });

  app.get('/products', merchantGuard, async (request) => {
    const query = request.query as { categoryId?: string };
    return dependencies.catalogService.queryMerchantProducts({ categoryId: query.categoryId });
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
