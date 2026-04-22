import { describe, expect, it } from 'vitest';

import { createUserRecord } from './user-record';

describe('createUserRecord', () => {
  it('creates the minimal phase-1 user shape', () => {
    const now = '2026-04-16T00:00:00.000Z';

    expect(
      createUserRecord({
        openid: 'user-openid',
        now,
        status: 'active'
      })
    ).toMatchObject({
      openid: 'user-openid',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      phoneBindingState: 'unbound',
      contactPhoneMasked: '',
      contactPhoneCountryCode: ''
    });
  });
});
