import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function customerRuntimeConfigRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.get('/runtime-config', async (request) => {
    const query = request.query as { sectionKeys?: string };
    return dependencies.runtimeConfigService.readCustomerRuntimeConfig({
      sectionKeys: dependencies.runtimeConfigService.parseSectionKeys(query.sectionKeys)
    });
  });
}
