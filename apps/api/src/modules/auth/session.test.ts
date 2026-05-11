import { describe, expect, it } from 'vitest';

import { ApiError } from '../../lib/errors';
import { createSessionToken, verifySessionToken } from './session';

describe('session tokens', () => {
  it('verifies a valid token', () => {
    const token = createSessionToken({ openid: 'openid-1' }, 'secret', 60, 100);
    expect(verifySessionToken(token, 'secret', 120).openid).toBe('openid-1');
  });

  it('rejects a tampered token', () => {
    const token = createSessionToken({ openid: 'openid-1' }, 'secret', 60, 100);
    const [payloadPart, envelopePart] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ openid: 'other', issuedAt: 100, expiresAt: 160 })).toString('base64url');
    const tampered = `${tamperedPayload}.${envelopePart}`;
    expect(() => verifySessionToken(tampered, 'secret', 120)).toThrow(ApiError);
  });

  it('rejects an expired token', () => {
    const token = createSessionToken({ openid: 'openid-1' }, 'secret', 60, 100);
    expect(() => verifySessionToken(token, 'secret', 161)).toThrow(ApiError);
  });

  it('rejects a malformed token', () => {
    expect(() => verifySessionToken('not-a-token', 'secret', 120)).toThrow(ApiError);
  });
});
