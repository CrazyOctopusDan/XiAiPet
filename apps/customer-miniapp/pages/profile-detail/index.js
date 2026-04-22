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
        ]
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
        if (!birthday) {
            return;
        }
        const result = (0, profile_1.setBirthday)(birthday);
        if (!result.ok) {
            wx.showToast({ title: '生日仅可设置一次', icon: 'none' });
            return;
        }
        this.refreshProfile();
        wx.showToast({ title: '生日已锁定', icon: 'none' });
    },
    handleSave() {
        (0, profile_1.updateProfile)({
            nickname: this.data.profile.nickname.trim() || '虾衣宠家长',
            gender: this.data.profile.gender
        });
        this.refreshProfile();
        wx.showToast({ title: '资料已更新', icon: 'none' });
    },
    handleContactTap() {
        wx.navigateTo({
            url: '/pages/contact-bind/index?source=profile-detail'
        });
    }
});
