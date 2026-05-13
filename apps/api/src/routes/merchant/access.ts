import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantAccessRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.get('/access', { preHandler: dependencies.guards.requireMerchantSession }, async (request) => {
    return {
      ok: true,
      status: 'allowed',
      allowed: true,
      merchant: {
        merchantId: request.merchant?.merchantId,
        storeName: request.merchant?.storeName
      },
      account: request.merchant
        ? {
            id: request.merchant.accountId,
            username: request.merchant.username,
            role: request.merchant.role,
            mustChangePassword: request.merchant.mustChangePassword
          }
        : null
    };
  });
}
