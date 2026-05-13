import type { FastifyInstance } from 'fastify';

import { ApiError } from '../../lib/errors';
import { createSessionToken } from '../../modules/auth/session';
import { toMerchantAccountPublic } from '../../modules/merchant-accounts/service';
import type { ApiRouteDependencies } from '../dependencies';

function createMerchantAccountToken(
  account: {
    id: string;
    username: string;
    role: 'admin' | 'staff';
    mustChangePassword: boolean;
  },
  dependencies: ApiRouteDependencies
) {
  return createSessionToken(
    {
      merchantAccountId: account.id,
      username: account.username,
      role: account.role,
      mustChangePassword: account.mustChangePassword,
      audience: 'merchant'
    },
    dependencies.config.sessionSecret,
    dependencies.config.sessionTtlSeconds
  );
}

export async function merchantAuthRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.post('/auth/login', async (request) => {
    const body = request.body as { username?: string; password?: string } | undefined;
    if (!body?.username || !body.password) {
      throw new ApiError('INVALID_MERCHANT_CREDENTIALS', '账号或密码错误', 401);
    }

    const login = await dependencies.merchantAccountService.login(body);
    const token = createMerchantAccountToken(login.account, dependencies);

    return {
      ok: true,
      token,
      expiresAt: new Date(Date.now() + dependencies.config.sessionTtlSeconds * 1000).toISOString(),
      account: toMerchantAccountPublic(login.account)
    };
  });

  app.post('/auth/change-password', { preHandler: dependencies.guards.requireMerchantAccountSession }, async (request) => {
    if (!request.merchant?.accountId) {
      throw new ApiError('UNAUTHORIZED', 'Missing merchant account session', 401);
    }

    const result = await dependencies.merchantAccountService.changePassword(
      request.merchant.accountId,
      request.body as { currentPassword?: string; newPassword?: string }
    );
    const token = createMerchantAccountToken(result.account, dependencies);

    return {
      ok: true,
      token,
      expiresAt: new Date(Date.now() + dependencies.config.sessionTtlSeconds * 1000).toISOString(),
      account: toMerchantAccountPublic(result.account)
    };
  });
}
