import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantAssetRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const merchantGuard = { preHandler: dependencies.guards.requireMerchantSession };

  app.post('/assets/upload-policies', merchantGuard, async (request) => {
    return dependencies.assetService.createUploadPolicy(request.merchant, request.body);
  });

  app.post('/assets/uploads/confirm', merchantGuard, async (request) => {
    return dependencies.assetService.confirmUpload(request.merchant, request.body);
  });
}
