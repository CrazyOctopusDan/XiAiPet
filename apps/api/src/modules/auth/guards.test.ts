import { describe, expect, it, vi } from 'vitest';
import type { FastifyRequest } from 'fastify';

import { createSessionToken } from './session';
import { createAuthGuards } from './guards';
import type { MerchantAccountRecord } from '../merchant-accounts/service';

function merchantAccount(overrides: Partial<MerchantAccountRecord> = {}): MerchantAccountRecord {
  const now = new Date('2026-05-13T00:00:00.000Z');

  return {
    id: 'acct-admin',
    username: 'admin',
    passwordHash: 'hashed-password',
    role: 'admin',
    status: 'active',
    mustChangePassword: true,
    createdBy: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('auth guards', () => {
  it('accepts merchant account sessions that must change their password', async () => {
    const sessionSecret = 'test-session-secret';
    const token = createSessionToken(
      {
        merchantAccountId: 'acct-admin',
        username: 'admin',
        role: 'admin',
        mustChangePassword: true,
        audience: 'merchant'
      },
      sessionSecret,
      60
    );
    const account = merchantAccount();
    const getActiveAccount = vi.fn(async () => account);
    const guards = createAuthGuards({
      sessionSecret,
      merchantAccountService: {
        getActiveAccount
      }
    });
    const request = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as FastifyRequest;

    await expect(guards.requireMerchantAccountSession(request, {} as never)).resolves.toBeUndefined();

    expect(getActiveAccount).toHaveBeenCalledWith('acct-admin');
    expect(request.merchant).toMatchObject({
      accountId: 'acct-admin',
      username: 'admin',
      role: 'admin',
      mustChangePassword: true
    });
  });

  it('rejects legacy merchant openid sessions', async () => {
    const sessionSecret = 'test-session-secret';
    const token = createSessionToken(
      {
        openid: 'legacy-merchant-openid',
        audience: 'merchant'
      },
      sessionSecret,
      60
    );
    const getActiveAccount = vi.fn(async () => merchantAccount());
    const guards = createAuthGuards({
      sessionSecret,
      merchantAccountService: {
        getActiveAccount
      }
    });
    const request = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as FastifyRequest;

    await expect(guards.requireMerchantAccountSession(request, {} as never)).rejects.toMatchObject({
      code: 'UNAUTHORIZED'
    });

    expect(getActiveAccount).not.toHaveBeenCalled();
  });
});
