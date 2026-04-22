"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRecord = createUserRecord;
exports.isUserRecord = isUserRecord;
function createUserRecord(input) {
    var _a;
    return {
        openid: input.openid,
        status: (_a = input.status) !== null && _a !== void 0 ? _a : 'active',
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
