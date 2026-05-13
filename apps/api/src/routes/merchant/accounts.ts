import type { FastifyInstance } from 'fastify';

import { ApiError } from '../../lib/errors';
import type { MerchantAccountRecord } from '../../modules/merchant-accounts/service';
import type { ApiRouteDependencies } from '../dependencies';

function currentMerchantAccount(request: { merchant?: { merchantUser?: unknown } }): MerchantAccountRecord {
  const account = request.merchant?.merchantUser as MerchantAccountRecord | undefined;
  if (!account?.id) {
    throw new ApiError('UNAUTHORIZED', 'Missing merchant account session', 401);
  }
  return account;
}

export async function merchantAccountRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const adminGuard = { preHandler: dependencies.guards.requireMerchantRole(['admin']) };

  app.get('/accounts', adminGuard, async (request) => {
    return dependencies.merchantAccountService.listAccounts(currentMerchantAccount(request));
  });

  app.post('/accounts/staff', adminGuard, async (request) => {
    return dependencies.merchantAccountService.createStaffAccount(
      currentMerchantAccount(request),
      request.body as { username?: string }
    );
  });

  app.patch('/accounts/:accountId/disable', adminGuard, async (request) => {
    const params = request.params as { accountId: string };
    return dependencies.merchantAccountService.disableStaffAccount(currentMerchantAccount(request), params.accountId);
  });

  app.post('/accounts/:accountId/reset-password', adminGuard, async (request) => {
    const params = request.params as { accountId: string };
    return dependencies.merchantAccountService.resetStaffPassword(currentMerchantAccount(request), params.accountId);
  });
}
