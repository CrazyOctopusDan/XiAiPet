import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function customerProfileRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.post('/profile/phone', { preHandler: dependencies.guards.requireCustomerSession }, async (request) => {
    return dependencies.identityService.bindPhone(request.auth?.openid ?? '', request.body);
  });
}
