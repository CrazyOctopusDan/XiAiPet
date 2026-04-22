import { describe, expect, it } from 'vitest';

import { buildBootstrapDecision } from './user-bootstrap';
import type { UserRecord } from '../types/user';

describe('buildBootstrapDecision', () => {
  it('creates a minimal record for first login without lazy collections', () => {
    const result = buildBootstrapDecision({
      openid: 'first-user',
      now: '2026-04-16T00:00:00.000Z',
      existingUser: null
    });

    expect(result.operation).toBe('create');
    expect(result.record).not.toHaveProperty('profile');
    expect(result.record.openid).toBe('first-user');
    expect(result.lazyCollections).toEqual([]);
  });

  it('restores an existing user without reinitializing optional data', () => {
    const existingUser: UserRecord = {
      openid: 'existing-user',
      status: 'active',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      lastLoginAt: '2026-04-01T00:00:00.000Z',
      phoneBindingState: 'bound',
      contactPhoneMasked: '138****0000',
      contactPhoneCountryCode: '+86'
    };

    const result = buildBootstrapDecision({
      openid: 'existing-user',
      now: '2026-04-16T00:00:00.000Z',
      existingUser
    });

    expect(result.operation).toBe('restore');
    expect(result.record.createdAt).toBe(existingUser.createdAt);
    expect(result.record.lastLoginAt).toBe('2026-04-16T00:00:00.000Z');
    expect(result.lazyCollections).toEqual([]);
  });
});
