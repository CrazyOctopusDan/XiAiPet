import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function customerCatalogRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.get('/catalog/categories', async () => {
    return dependencies.catalogService.queryCustomerCategories();
  });

  app.get('/catalog/products', async (request) => {
    const query = request.query as { categoryId?: string };
    return dependencies.catalogService.queryCustomerProducts({ categoryId: query.categoryId });
  });
}
