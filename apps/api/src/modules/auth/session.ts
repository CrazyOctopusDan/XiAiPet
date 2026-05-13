import crypto from 'node:crypto';

import { ApiError } from '../../lib/errors';
import type { AuthSessionAudience, AuthSessionPayload } from './types';

interface TokenEnvelope {
  payload: AuthSessionPayload;
  signature: string;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}

function signPayload(payloadPart: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadPart).digest('base64url');
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(
  input: {
    openid?: string;
    unionid?: string;
    merchantAccountId?: string;
    username?: string;
    role?: AuthSessionPayload['role'];
    mustChangePassword?: boolean;
    audience: AuthSessionAudience;
  },
  secret: string,
  ttlSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  if (!input.openid && !input.merchantAccountId) {
    throw new ApiError('INVALID_SESSION_SUBJECT', 'Session subject is required', 500);
  }

  const payload: AuthSessionPayload = {
    openid: input.openid,
    unionid: input.unionid,
    merchantAccountId: input.merchantAccountId,
    username: input.username,
    role: input.role,
    mustChangePassword: input.mustChangePassword,
    audience: input.audience,
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + ttlSeconds
  };
  const payloadPart = encodeJson(payload);
  const envelope: TokenEnvelope = {
    payload,
    signature: signPayload(payloadPart, secret)
  };
  return `${payloadPart}.${encodeJson(envelope)}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  expectedAudience?: AuthSessionAudience
): AuthSessionPayload {
  try {
    const [payloadPart, envelopePart] = token.split('.');
    if (!payloadPart || !envelopePart) {
      throw new Error('malformed');
    }

    const payload = decodeJson<AuthSessionPayload>(payloadPart);
    const envelope = decodeJson<TokenEnvelope>(envelopePart);
    const expectedSignature = signPayload(payloadPart, secret);
    if (
      envelope.payload.openid !== payload.openid ||
      envelope.payload.unionid !== payload.unionid ||
      envelope.payload.merchantAccountId !== payload.merchantAccountId ||
      envelope.payload.username !== payload.username ||
      envelope.payload.role !== payload.role ||
      envelope.payload.mustChangePassword !== payload.mustChangePassword ||
      envelope.payload.audience !== payload.audience ||
      envelope.payload.issuedAt !== payload.issuedAt ||
      envelope.payload.expiresAt !== payload.expiresAt ||
      !timingSafeEqual(envelope.signature, expectedSignature)
    ) {
      throw new Error('invalid');
    }
    if ((!payload.openid && !payload.merchantAccountId) || !payload.audience || payload.expiresAt <= nowSeconds) {
      throw new Error('expired');
    }
    if (expectedAudience && payload.audience !== expectedAudience) {
      throw new Error('wrong audience');
    }
    return payload;
  } catch {
    throw new ApiError('UNAUTHORIZED', 'Invalid session', 401);
  }
}
