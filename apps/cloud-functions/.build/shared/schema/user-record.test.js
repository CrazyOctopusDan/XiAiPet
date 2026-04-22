"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const user_record_1 = require("./user-record");
(0, vitest_1.describe)('createUserRecord', () => {
    (0, vitest_1.it)('creates the minimal phase-1 user shape', () => {
        const now = '2026-04-16T00:00:00.000Z';
        (0, vitest_1.expect)((0, user_record_1.createUserRecord)({
            openid: 'user-openid',
            now,
            status: 'active'
        })).toMatchObject({
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
