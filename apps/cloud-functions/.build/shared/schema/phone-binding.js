"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneBinding = normalizePhoneBinding;
exports.isPhoneBindingInput = isPhoneBindingInput;
function normalizePhoneBinding(input) {
    const digits = input.phoneNumber.replace(/\s+/g, '');
    const normalizedCountryCode = input.countryCode.startsWith('+')
        ? input.countryCode
        : `+${input.countryCode}`;
    const visibleHead = digits.slice(0, 3);
    const visibleTail = digits.slice(-4);
    return {
        ...input,
        phoneNumber: digits,
        countryCode: normalizedCountryCode,
        maskedPhone: `${visibleHead}****${visibleTail}`
    };
}
function isPhoneBindingInput(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return (typeof candidate.phoneNumber === 'string' &&
        candidate.phoneNumber.length > 0 &&
        typeof candidate.countryCode === 'string' &&
        candidate.countryCode.length > 0 &&
        (candidate.source === 'wechat' || candidate.source === 'manual'));
}
