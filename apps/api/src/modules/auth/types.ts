import type { FastifyRequest } from 'fastify';

export type AuthSessionAudience = 'customer' | 'merchant';
export type MerchantAccountRole = 'admin' | 'staff';

export interface AuthSessionPayload {
  openid?: string;
  unionid?: string;
  merchantAccountId?: string;
  username?: string;
  role?: MerchantAccountRole;
  mustChangePassword?: boolean;
  audience: AuthSessionAudience;
  issuedAt: number;
  expiresAt: number;
}

export interface AuthContext {
  openid?: string;
  unionid?: string;
  merchantAccountId?: string;
  username?: string;
  role?: MerchantAccountRole;
  mustChangePassword?: boolean;
  audience: AuthSessionAudience;
}

export interface MerchantContext {
  openid: string;
  accountId: string;
  username: string;
  role: MerchantAccountRole;
  mustChangePassword: boolean;
  merchantId: string;
  storeName: string;
  merchantUser?: unknown;
}

export interface AuthenticatedRequest extends FastifyRequest {
  auth?: AuthContext;
  merchant?: MerchantContext;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    merchant?: MerchantContext;
  }
}
