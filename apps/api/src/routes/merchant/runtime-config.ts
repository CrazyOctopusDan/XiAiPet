import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantRuntimeConfigRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const merchantGuard = { preHandler: dependencies.guards.requireMerchantSession };

  app.get('/runtime-config/sections', merchantGuard, async (request) => {
    return dependencies.runtimeConfigService.getRuntimeConfigSections(request.merchant);
  });

  app.get('/runtime-config', merchantGuard, async (request) => {
    const query = request.query as { sectionKeys?: string };
    return dependencies.runtimeConfigService.readMerchantRuntimeConfig(request.merchant, {
      sectionKeys: dependencies.runtimeConfigService.parseSectionKeys(query.sectionKeys)
    });
  });

  app.put('/runtime-config/sections/:sectionKey', merchantGuard, async (request) => {
    const params = request.params as { sectionKey: string };
    return dependencies.runtimeConfigService.upsertRuntimeConfigSection(request.merchant, params.sectionKey, request.body);
  });
}
