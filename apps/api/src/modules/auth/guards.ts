import type { FastifyReply, FastifyRequest } from 'fastify';

import { ApiError } from '../../lib/errors';
import { verifySessionToken } from './session';
import type {
  AuthSessionAudience,
  AuthenticatedRequest,
  MerchantAccessService,
  MerchantAccountRole
} from './types';
import type { MerchantAccountRecord } from '../merchant-accounts/service';

export interface AuthGuardDependencies {
  sessionSecret: string;
  merchantAccessService: MerchantAccessService;
  merchantAccountService: {
    getActiveAccount(accountId: string): Promise<MerchantAccountRecord>;
  };
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
      merchantAccountId: payload.merchantAccountId,
      username: payload.username,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
      audience: payload.audience
    };
    return authenticated;
  }

  async function requireCustomerSession(request: FastifyRequest, _reply: FastifyReply) {
    const authenticated = authenticateSession(request, 'customer');
    if (!authenticated.auth?.openid) {
      throw new ApiError('UNAUTHORIZED', 'Missing customer session', 401);
    }
  }

  async function requireMerchantAccountSession(request: FastifyRequest, _reply: FastifyReply) {
    const authenticated = authenticateSession(request, 'merchant');
    const accountId = authenticated.auth?.merchantAccountId;
    if (!accountId) {
      return requireLegacyMerchantSession(request, _reply);
    }

    const account = await dependencies.merchantAccountService.getActiveAccount(accountId);
    authenticated.auth = {
      ...authenticated.auth,
      audience: 'merchant',
      merchantAccountId: account.id,
      username: account.username,
      role: account.role,
      mustChangePassword: account.mustChangePassword
    };
    authenticated.merchant = {
      openid: account.id,
      accountId: account.id,
      username: account.username,
      role: account.role,
      mustChangePassword: account.mustChangePassword,
      merchantId: 'default-merchant',
      storeName: '虾衣宠商户端',
      merchantUser: account
    };
  }

  async function requireMerchantSession(request: FastifyRequest, reply: FastifyReply) {
    await requireMerchantAccountSession(request, reply);
    if (request.merchant?.mustChangePassword) {
      throw new ApiError('PASSWORD_CHANGE_REQUIRED', '请先修改初始密码', 403);
    }
  }

  function requireMerchantRole(roles: MerchantAccountRole[]) {
    return async function merchantRoleGuard(request: FastifyRequest, reply: FastifyReply) {
      await requireMerchantSession(request, reply);
      if (!request.merchant?.role || !roles.includes(request.merchant.role)) {
        throw new ApiError('MERCHANT_PERMISSION_DENIED', '当前账号没有权限执行该操作', 403);
      }
    };
  }

  async function requireLegacyMerchantSession(request: FastifyRequest, _reply: FastifyReply) {
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
      accountId: openid,
      username: openid,
      role: 'admin',
      mustChangePassword: false,
      merchantId: access.merchant.merchantId,
      storeName: access.merchant.storeName,
      merchantUser: access.merchantUser
    };
  }

  return {
    requireCustomerSession,
    requireMerchantAccountSession,
    requireMerchantSession,
    requireMerchantRole,
    requireLegacyMerchantSession
  };
}
