"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const phone_1 = require("../../src/services/phone");
const profile_1 = require("../../src/services/profile");
function maskPhone(phoneNumber) {
    if (phoneNumber.length < 7) {
        return phoneNumber;
    }
    return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`;
}
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
function getEditableProfilePhone() {
    const phone = (0, profile_1.getProfile)().contactPhone.trim();
    return phone && !phone.includes('*') ? phone : '';
}
Page({
    data: {
        submitting: false,
        statusText: '等待绑定手机号',
        statusTone: 'idle',
        manualPhone: '',
        manualCountryCode: '+86',
        redirectUrl: ''
    },
    onLoad(options) {
        this.setData({
            redirectUrl: resolveRedirectUrl(options === null || options === void 0 ? void 0 : options.redirect),
            manualPhone: getEditableProfilePhone()
        });
        void this.hydrateExistingPhone();
    },
    async hydrateExistingPhone() {
        if (this.data.manualPhone.trim()) {
            return;
        }
        try {
            await (0, profile_1.hydrateProfile)();
            const phone = getEditableProfilePhone();
            if (phone) {
                this.setData({ manualPhone: phone });
            }
        }
        catch (_a) {
            // Keep the field editable when the latest profile cannot be loaded.
        }
    },
    handleManualPhoneInput(event) {
        var _a, _b;
        this.setData({ manualPhone: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    async handleManualSubmit() {
        const { manualPhone, manualCountryCode } = this.data;
        this.setData({ submitting: true, statusText: '正在提交手动补录', statusTone: 'idle' });
        await this.commit(async () => (0, phone_1.submitManualPhone)({
            phoneNumber: manualPhone,
            countryCode: manualCountryCode
        }), manualPhone.replace(/\s+/g, ''));
    },
    async commit(action, fallbackContactPhone = '') {
        var _a, _b;
        try {
            const result = (await action());
            (0, profile_1.updateProfile)({
                contactPhone: fallbackContactPhone,
                contactPhoneMasked: (_b = (_a = result.update) === null || _a === void 0 ? void 0 : _a.contactPhoneMasked) !== null && _b !== void 0 ? _b : maskPhone(fallbackContactPhone)
            });
            this.setData({ submitting: false, statusText: '联系方式已安全保存', statusTone: 'success' });
            if (this.data.redirectUrl) {
                wx.redirectTo({
                    url: this.data.redirectUrl
                });
            }
        }
        catch (error) {
            console.error('contact bind failed', error);
            this.setData({
                submitting: false,
                statusText: '身份同步失败，请稍后重试或手动补录',
                statusTone: 'error'
            });
        }
    }
});
