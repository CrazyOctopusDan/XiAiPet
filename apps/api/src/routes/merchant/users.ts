import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantUserRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const adminGuard = { preHandler: dependencies.guards.requireMerchantRole(['admin']) };

  app.get('/users', adminGuard, async (request) => {
    const query = request.query as { query?: string; searchField?: string };
    return dependencies.merchantUserService.searchMerchantUsers(request.merchant, query);
  });

  app.get('/users/:openid', adminGuard, async (request) => {
    const params = request.params as { openid: string };
    return dependencies.merchantUserService.getMerchantUserDetail(request.merchant, params.openid);
  });

  app.get('/users/:openid/addresses', adminGuard, async (request) => {
    const params = request.params as { openid: string };
    return dependencies.merchantUserService.getMerchantUserAddresses(request.merchant, params.openid);
  });

  app.get('/users/:openid/balance-ledgers', adminGuard, async (request) => {
    const params = request.params as { openid: string };
    const query = request.query as { cursor?: string; limit?: string } | undefined;
    return dependencies.merchantUserService.getMerchantUserBalanceLedgers(request.merchant, params.openid, query);
  });

  app.post('/users/:openid/balance-adjustments', adminGuard, async (request) => {
    const params = request.params as { openid: string };
    return dependencies.merchantUserService.adjustUserBalance(request.merchant, params.openid, request.body);
  });
}
