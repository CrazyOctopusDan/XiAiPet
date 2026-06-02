import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

type CustomerDeliveryMode = 'pickup' | 'delivery' | 'express';
type CatalogAvailability = 'available' | 'soldOut';

function parseDeliveryMode(value: unknown): CustomerDeliveryMode | undefined {
  return value === 'pickup' || value === 'delivery' || value === 'express' ? value : undefined;
}

function parseAvailability(value: unknown): CatalogAvailability {
  return value === 'soldOut' ? 'soldOut' : 'available';
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

export async function customerCatalogRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.get('/catalog/categories', async (request) => {
    const query = request.query as Record<string, unknown>;
    return dependencies.catalogService.queryCustomerCategories({
      deliveryMode: parseDeliveryMode(query.deliveryMode)
    });
  });

  app.get('/catalog/categories/:categoryId/products', async (request) => {
    const params = request.params as { categoryId: string };
    const query = request.query as Record<string, unknown>;
    return dependencies.catalogService.queryCustomerCategoryProducts({
      categoryId: params.categoryId,
      deliveryMode: parseDeliveryMode(query.deliveryMode),
      availability: parseAvailability(query.availability),
      limit: parsePositiveInteger(query.limit),
      cursor: parseString(query.cursor)
    });
  });

  app.get('/catalog/products/search', async (request) => {
    const query = request.query as Record<string, unknown>;
    return dependencies.catalogService.searchCustomerProducts({
      keyword: parseString(query.keyword),
      deliveryMode: parseDeliveryMode(query.deliveryMode),
      limit: parsePositiveInteger(query.limit),
      cursor: parseString(query.cursor)
    });
  });

  app.get('/catalog/products/:productId', async (request) => {
    const params = request.params as { productId: string };
    return dependencies.catalogService.getCustomerProductDetail(params.productId);
  });

  app.get('/catalog/products', async (request) => {
    const query = request.query as { categoryId?: string };
    return dependencies.catalogService.queryCustomerProducts({ categoryId: query.categoryId });
  });
}
