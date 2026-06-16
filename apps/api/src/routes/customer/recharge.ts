import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function customerRechargeRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const customerGuard = { preHandler: dependencies.guards.requireCustomerSession };

  app.get('/recharge-plans', customerGuard, async () => {
    return dependencies.rechargeService.listCustomerRechargePlans();
  });

  app.post('/recharge-transactions', customerGuard, async (request) => {
    return dependencies.rechargeService.createCustomerRechargeTransaction(request.auth?.openid ?? '', request.body);
  });

  app.post('/recharge-transactions/:transactionId/payment-sync', customerGuard, async (request) => {
    const params = request.params as { transactionId: string };
    return dependencies.rechargeService.syncCustomerRechargeTransaction(request.auth?.openid ?? '', params.transactionId);
  });
}
