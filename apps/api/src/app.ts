import Fastify, { type FastifyInstance } from 'fastify';

import { loadApiConfig } from './config/env';
import { ApiError, toErrorResponse } from './lib/errors';
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

  app.setErrorHandler((error, request, reply) => {
    if (!(error instanceof ApiError)) {
      request.log.error({ err: error }, 'api request failed');
    }
    const response = toErrorResponse(error);
    reply.status(response.statusCode).send(response.body);
  });

  app.register(healthRoutes);
  app.register(apiV1Routes, { dependencies });

  return app;
}
