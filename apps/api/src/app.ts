import Fastify, { type FastifyInstance } from 'fastify';

import { loadApiConfig } from './config/env';
import { toErrorResponse } from './lib/errors';
import { createLoggerOptions } from './lib/logger';
import { healthRoutes } from './routes/health';

export function buildApp(): FastifyInstance {
  const config = loadApiConfig();
  const app = Fastify({
    logger: createLoggerOptions(config)
  });

  app.setErrorHandler((error, _request, reply) => {
    const response = toErrorResponse(error);
    reply.status(response.statusCode).send(response.body);
  });

  app.register(healthRoutes);

  return app;
}
