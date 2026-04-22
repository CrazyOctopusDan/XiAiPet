"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetProfile = resetProfile;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.setBirthday = setBirthday;
exports.getProfileSummary = getProfileSummary;
const initialProfile = {
    avatarText: '虾',
    nickname: '虾衣宠家长',
    gender: 'unknown',
    memberLevel: '普通会员',
    balance: 268,
    totalSpent: 1288,
    birthday: '',
    birthdayLocked: false,
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
        contactPhoneLabel: profile.contactPhoneMasked || '未绑定手机号'
    };
}
