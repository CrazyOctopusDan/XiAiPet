import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantRuntimeConfigRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const adminGuard = { preHandler: dependencies.guards.requireMerchantRole(['admin']) };

  app.get('/runtime-config/sections', adminGuard, async (request) => {
    return dependencies.runtimeConfigService.getRuntimeConfigSections(request.merchant);
  });

  app.get('/runtime-config', adminGuard, async (request) => {
    const query = request.query as { sectionKeys?: string };
    return dependencies.runtimeConfigService.readMerchantRuntimeConfig(request.merchant, {
      sectionKeys: dependencies.runtimeConfigService.parseSectionKeys(query.sectionKeys)
    });
  });

  app.put('/runtime-config/sections/:sectionKey', adminGuard, async (request) => {
    const params = request.params as { sectionKey: string };
    return dependencies.runtimeConfigService.upsertRuntimeConfigSection(request.merchant, params.sectionKey, request.body);
  });
}
