import crypto from 'node:crypto';

import { ApiError } from '../../lib/errors';
import type { AuthSessionPayload } from './types';

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
  input: { openid: string; unionid?: string },
  secret: string,
  ttlSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  const payload: AuthSessionPayload = {
    openid: input.openid,
    unionid: input.unionid,
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
  nowSeconds = Math.floor(Date.now() / 1000)
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
      envelope.payload.expiresAt !== payload.expiresAt ||
      !timingSafeEqual(envelope.signature, expectedSignature)
    ) {
      throw new Error('invalid');
    }
    if (!payload.openid || payload.expiresAt <= nowSeconds) {
      throw new Error('expired');
    }
    return payload;
  } catch {
    throw new ApiError('UNAUTHORIZED', 'Invalid session', 401);
  }
}
