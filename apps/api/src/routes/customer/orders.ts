import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function customerOrderRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const customerGuard = { preHandler: dependencies.guards.requireCustomerSession };

  app.post('/orders', customerGuard, async (request) => {
    return dependencies.orderService.createCustomerOrder(request.auth?.openid ?? '', request.body);
  });

  app.post('/orders/:orderId/payment', customerGuard, async (request) => {
    const params = request.params as { orderId: string };
    return dependencies.orderService.startCustomerPayment(request.auth?.openid ?? '', params.orderId, request.body);
  });

  app.post('/orders/:orderId/payment-sync', customerGuard, async (request) => {
    const params = request.params as { orderId: string };
    return dependencies.orderService.syncCustomerPayment(request.auth?.openid ?? '', params.orderId);
  });

  app.post('/orders/:orderId/payment-confirmation', customerGuard, async (request) => {
    const params = request.params as { orderId: string };
    return dependencies.orderService.confirmCustomerPayment(request.auth?.openid ?? '', params.orderId, request.body);
  });

  app.get('/orders', customerGuard, async (request) => {
    return dependencies.orderService.queryCustomerOrders(request.auth?.openid ?? '', request.query as Record<string, unknown>);
  });

  app.get('/orders/:orderId', customerGuard, async (request) => {
    const params = request.params as { orderId: string };
    return dependencies.orderService.getCustomerOrderDetail(request.auth?.openid ?? '', params.orderId);
  });
}
