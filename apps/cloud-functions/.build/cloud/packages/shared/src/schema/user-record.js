"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRecord = createUserRecord;
exports.isUserRecord = isUserRecord;
function createUserRecord(input) {
    return {
        openid: input.openid,
        status: input.status ?? 'active',
        createdAt: input.now,
        updatedAt: input.now,
        lastLoginAt: input.now,
        phoneBindingState: 'unbound',
        contactPhoneMasked: '',
        contactPhoneCountryCode: ''
    };
}
function isUserRecord(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return (typeof candidate.openid === 'string' &&
        typeof candidate.status === 'string' &&
        typeof candidate.createdAt === 'string' &&
        typeof candidate.updatedAt === 'string' &&
        typeof candidate.lastLoginAt === 'string' &&
        (candidate.phoneBindingState === 'unbound' || candidate.phoneBindingState === 'bound') &&
        typeof candidate.contactPhoneMasked === 'string' &&
        typeof candidate.contactPhoneCountryCode === 'string');
}
