"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetProfile = resetProfile;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.saveProfile = saveProfile;
exports.hydrateProfile = hydrateProfile;
exports.setBirthday = setBirthday;
exports.getProfileSummary = getProfileSummary;
exports.hasBoundPhone = hasBoundPhone;
exports.getPhoneBindingRedirectUrl = getPhoneBindingRedirectUrl;
const api_client_1 = require("./api-client");
const initialProfile = {
    avatarText: '喜',
    nickname: '喜爱宠家长',
    gender: 'unknown',
    memberLevel: '普通会员',
    balance: 0,
    totalSpent: 0,
    birthday: '',
    birthdayLocked: false,
    contactPhone: '',
    contactPhoneMasked: ''
};
let profile = { ...initialProfile };
function resetProfile() {
    profile = { ...initialProfile };
}
function getProfile() {
    return { ...profile };
}
function updateProfile(input) {
    profile = {
        ...profile,
        ...input
    };
    return getProfile();
}
async function saveProfile(input, request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request('/api/v1/customer/profile', {
        method: 'PUT',
        auth: 'customer',
        body: {
            profile: input
        }
    });
    return updateProfile((_a = response.profile) !== null && _a !== void 0 ? _a : input);
}
async function hydrateProfile(request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request('/api/v1/customer/profile', {
        method: 'GET',
        auth: 'customer'
    });
    return updateProfile((_a = response.profile) !== null && _a !== void 0 ? _a : {});
}
function setBirthday(birthday) {
    if (profile.birthdayLocked) {
        return {
            ok: false,
            reason: 'birthday_locked'
        };
    }
    profile = {
        ...profile,
        birthday,
        birthdayLocked: true
    };
    return {
        ok: true,
        profile: getProfile()
    };
}
function getProfileSummary() {
    return {
        avatarText: profile.avatarText,
        nickname: profile.nickname,
        memberLevel: profile.memberLevel,
        balance: profile.balance,
        totalSpent: profile.totalSpent,
        birthdayLabel: profile.birthday || '未设置生日',
        contactPhoneLabel: profile.contactPhone || profile.contactPhoneMasked || '未绑定手机号'
    };
}
function hasBoundPhone(input = profile) {
    return Boolean(input.contactPhone.trim() || input.contactPhoneMasked.trim());
}
function getPhoneBindingRedirectUrl(redirectUrl) {
    const baseUrl = '/pages/contact-bind/index';
    return redirectUrl ? `${baseUrl}?redirect=${encodeURIComponent(redirectUrl)}` : baseUrl;
}
