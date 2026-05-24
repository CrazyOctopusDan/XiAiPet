"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const profile_1 = require("../../src/services/profile");
Page({
    data: {
        profile: (0, profile_1.getProfile)(),
        genderOptions: [
            { value: 'unknown', label: '暂不设置' },
            { value: 'female', label: '女孩' },
            { value: 'male', label: '男孩' }
        ],
        redirectUrl: ''
    },
    onLoad(options) {
        this.setData({
            redirectUrl: resolveRedirectUrl(options === null || options === void 0 ? void 0 : options.redirect)
        });
    },
    onShow() {
        this.refreshProfile();
    },
    refreshProfile() {
        this.setData({
            profile: (0, profile_1.getProfile)()
        });
    },
    handleNicknameInput(event) {
        var _a, _b;
        this.setData({
            profile: {
                ...this.data.profile,
                nickname: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    handleGenderTap(event) {
        var _a, _b;
        const gender = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.gender;
        if (!gender) {
            return;
        }
        this.setData({
            profile: {
                ...this.data.profile,
                gender
            }
        });
    },
    handleBirthdayChange(event) {
        var _a, _b;
        const birthday = (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
        if (!birthday || this.data.profile.birthdayLocked) {
            return;
        }
        this.setData({
            profile: {
                ...this.data.profile,
                birthday
            }
        });
    },
    async handleSave() {
        const birthday = this.data.profile.birthday.trim();
        (0, profile_1.updateProfile)({
            nickname: this.data.profile.nickname.trim() || '虾衣宠家长',
            gender: this.data.profile.gender
        });
        if (!(0, profile_1.getProfile)().birthdayLocked && birthday) {
            const result = (0, profile_1.setBirthday)(birthday);
            if (!result.ok) {
                wx.showToast({ title: '生日仅可设置一次', icon: 'none' });
                this.refreshProfile();
                return;
            }
        }
        const nextProfile = (0, profile_1.getProfile)();
        this.refreshProfile();
        try {
            await (0, profile_1.saveProfile)({
                nickname: nextProfile.nickname,
                gender: nextProfile.gender,
                birthday: nextProfile.birthday,
                birthdayLocked: nextProfile.birthdayLocked,
                contactPhoneMasked: nextProfile.contactPhoneMasked
            });
            wx.showToast({ title: '资料已同步', icon: 'none' });
        }
        catch (_a) {
            wx.showToast({ title: '资料已保存本地，稍后同步', icon: 'none' });
        }
        this.refreshProfile();
    },
    handleContactTap() {
        wx.navigateTo({
            url: (0, profile_1.getPhoneBindingRedirectUrl)(this.data.redirectUrl || '/pages/profile-detail/index')
        });
    }
});
function resolveRedirectUrl(value) {
    if (!value) {
        return '';
    }
    try {
        const decoded = decodeURIComponent(value);
        return decoded.startsWith('/pages/') ? decoded : '';
    }
    catch (_a) {
        return '';
    }
}
