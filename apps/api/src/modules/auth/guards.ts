import type { FastifyReply, FastifyRequest } from 'fastify';

import { ApiError } from '../../lib/errors';
import { verifySessionToken } from './session';
import type { AuthenticatedRequest, MerchantAccessService } from './types';

export interface AuthGuardDependencies {
  sessionSecret: string;
  merchantAccessService: MerchantAccessService;
}

function readBearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError('UNAUTHORIZED', 'Missing session', 401);
  }
  return header.slice('Bearer '.length).trim();
}

export function createAuthGuards(dependencies: AuthGuardDependencies) {
  async function requireCustomerSession(request: FastifyRequest, _reply: FastifyReply) {
    const payload = verifySessionToken(readBearerToken(request), dependencies.sessionSecret);
    const authenticated = request as AuthenticatedRequest;
    authenticated.auth = {
      openid: payload.openid,
      unionid: payload.unionid
    };
  }

  async function requireMerchantSession(request: FastifyRequest, reply: FastifyReply) {
    await requireCustomerSession(request, reply);
    const authenticated = request as AuthenticatedRequest;
    const openid = authenticated.auth?.openid;
    if (!openid) {
      throw new ApiError('UNAUTHORIZED', 'Missing session', 401);
    }

    const access = await dependencies.merchantAccessService.assertMerchantAccess(openid);
    if (!access.allowed || !access.merchant) {
      throw new ApiError('MERCHANT_FORBIDDEN', access.reason ?? '当前账号还未加入 merchant_users 白名单', 403);
    }

    authenticated.merchant = {
      openid,
      merchantId: access.merchant.merchantId,
      storeName: access.merchant.storeName,
      merchantUser: access.merchantUser
    };
  }

  return {
    requireCustomerSession,
    requireMerchantSession
  };
}
