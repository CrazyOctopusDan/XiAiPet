import Fastify, { type FastifyInstance } from 'fastify';

import { loadApiConfig } from './config/env';
import { toErrorResponse } from './lib/errors';
import { createLoggerOptions } from './lib/logger';
import { createApiRouteDependencies, type ApiRouteDependencyOverrides } from './routes/dependencies';
import { apiV1Routes } from './routes/api-v1';
import { healthRoutes } from './routes/health';

export interface BuildAppOptions {
  config?: ReturnType<typeof loadApiConfig>;
  dependencies?: ApiRouteDependencyOverrides;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const config = options.config ?? loadApiConfig();
  const dependencies = createApiRouteDependencies(config, options.dependencies);
  const app = Fastify({
    logger: createLoggerOptions(config)
  });

  app.setErrorHandler((error, _request, reply) => {
    const response = toErrorResponse(error);
    reply.status(response.statusCode).send(response.body);
  });

  app.register(healthRoutes);
  app.register(apiV1Routes, { dependencies });

  return app;
}
