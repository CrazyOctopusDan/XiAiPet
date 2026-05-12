import type { FastifyRequest } from 'fastify';

export type AuthSessionAudience = 'customer' | 'merchant';

export interface AuthSessionPayload {
  openid: string;
  unionid?: string;
  audience: AuthSessionAudience;
  issuedAt: number;
  expiresAt: number;
}

export interface AuthContext {
  openid: string;
  unionid?: string;
  audience: AuthSessionAudience;
}

export interface MerchantContext {
  openid: string;
  merchantId: string;
  storeName: string;
  merchantUser?: unknown;
}

export interface MerchantAccessResult {
  ok: true;
  status: 'allowed' | 'denied';
  allowed: boolean;
  reason?: string;
  merchant?: {
    merchantId: string;
    storeName: string;
  };
  merchantUser?: unknown;
}

export interface MerchantAccessService {
  assertMerchantAccess(openid: string): Promise<MerchantAccessResult>;
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
