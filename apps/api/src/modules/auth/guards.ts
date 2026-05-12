import type { FastifyReply, FastifyRequest } from 'fastify';

import { ApiError } from '../../lib/errors';
import { verifySessionToken } from './session';
import type { AuthSessionAudience, AuthenticatedRequest, MerchantAccessService } from './types';

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
  function authenticateSession(request: FastifyRequest, audience: AuthSessionAudience) {
    const payload = verifySessionToken(readBearerToken(request), dependencies.sessionSecret, undefined, audience);
    const authenticated = request as AuthenticatedRequest;
    authenticated.auth = {
      openid: payload.openid,
      unionid: payload.unionid,
      audience: payload.audience
    };
    return authenticated;
  }

  async function requireCustomerSession(request: FastifyRequest, _reply: FastifyReply) {
    authenticateSession(request, 'customer');
  }

  async function requireMerchantSession(request: FastifyRequest, _reply: FastifyReply) {
    const authenticated = authenticateSession(request, 'merchant');
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
