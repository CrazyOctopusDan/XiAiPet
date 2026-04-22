"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const user_bootstrap_1 = require("./user-bootstrap");
(0, vitest_1.describe)('buildBootstrapDecision', () => {
    (0, vitest_1.it)('creates a minimal record for first login without lazy collections', () => {
        const result = (0, user_bootstrap_1.buildBootstrapDecision)({
            openid: 'first-user',
            now: '2026-04-16T00:00:00.000Z',
            existingUser: null
        });
        (0, vitest_1.expect)(result.operation).toBe('create');
        (0, vitest_1.expect)(result.record).not.toHaveProperty('profile');
        (0, vitest_1.expect)(result.record.openid).toBe('first-user');
        (0, vitest_1.expect)(result.lazyCollections).toEqual([]);
    });
    (0, vitest_1.it)('restores an existing user without reinitializing optional data', () => {
        const existingUser = {
            openid: 'existing-user',
            status: 'active',
            createdAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-01T00:00:00.000Z',
            lastLoginAt: '2026-04-01T00:00:00.000Z',
            phoneBindingState: 'bound',
            contactPhoneMasked: '138****0000',
            contactPhoneCountryCode: '+86'
        };
        const result = (0, user_bootstrap_1.buildBootstrapDecision)({
            openid: 'existing-user',
            now: '2026-04-16T00:00:00.000Z',
            existingUser
        });
        (0, vitest_1.expect)(result.operation).toBe('restore');
        (0, vitest_1.expect)(result.record.createdAt).toBe(existingUser.createdAt);
        (0, vitest_1.expect)(result.record.lastLoginAt).toBe('2026-04-16T00:00:00.000Z');
        (0, vitest_1.expect)(result.lazyCollections).toEqual([]);
    });
});
