import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantOrderRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const merchantGuard = { preHandler: dependencies.guards.requireMerchantSession };

  app.get('/orders', merchantGuard, async (request) => {
    return dependencies.orderService.queryMerchantOrders(request.merchant, request.query as Record<string, unknown>);
  });

  app.get('/orders/:orderId', merchantGuard, async (request) => {
    const params = request.params as { orderId: string };
    return dependencies.orderService.getMerchantOrderDetail(request.merchant, params.orderId);
  });

  app.patch('/orders/:orderId/status', merchantGuard, async (request) => {
    const params = request.params as { orderId: string };
    return dependencies.orderService.updateMerchantOrderStatus(request.merchant, params.orderId, request.body);
  });
}
