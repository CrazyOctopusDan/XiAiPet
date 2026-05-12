import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantAccessRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.get('/access', { preHandler: dependencies.guards.requireMerchantSession }, async (request) => {
    return dependencies.identityService.assertMerchantAccess(request.auth?.openid ?? '');
  });
}
