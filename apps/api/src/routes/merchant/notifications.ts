import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantNotificationRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const merchantGuard = { preHandler: dependencies.guards.requireMerchantSession };

  app.post('/notifications/new-order-subscription', merchantGuard, async (request) => {
    return dependencies.merchantNotificationService.enableNewOrderSubscription(
      request.merchant?.merchantUser as never,
      request.body as { code?: string; templateId?: string }
    );
  });
}
