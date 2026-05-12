import type { FastifyInstance } from 'fastify';

import { ApiError } from '../../lib/errors';
import { createSessionToken } from '../../modules/auth/session';
import type { ApiRouteDependencies } from '../dependencies';

export async function customerAuthRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.post('/auth/login', async (request) => {
    const body = request.body as { code?: string } | undefined;
    if (!body?.code) {
      throw new ApiError('INVALID_LOGIN_CODE', 'wx.login code is required', 400);
    }
    const login = await dependencies.customerWechatLoginProvider.exchangeLoginCode(body.code);
    const token = createSessionToken(
      { openid: login.openid, unionid: login.unionid, audience: 'customer' },
      dependencies.config.sessionSecret,
      dependencies.config.sessionTtlSeconds
    );
    return {
      ok: true,
      token,
      expiresAt: new Date(Date.now() + dependencies.config.sessionTtlSeconds * 1000).toISOString(),
      openid: login.openid
    };
  });

  app.post('/bootstrap', { preHandler: dependencies.guards.requireCustomerSession }, async (request) => {
    return dependencies.identityService.bootstrapUser(request.auth?.openid ?? '');
  });
}
