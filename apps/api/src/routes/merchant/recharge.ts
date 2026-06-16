import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantRechargeRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const adminGuard = { preHandler: dependencies.guards.requireMerchantRole(['admin']) };

  app.get('/recharge-plans', adminGuard, async (request) => {
    return dependencies.rechargeService.listMerchantRechargePlans(request.merchant);
  });

  app.put('/recharge-plans', adminGuard, async (request) => {
    return dependencies.rechargeService.saveMerchantRechargePlans(request.merchant, request.body);
  });
}
