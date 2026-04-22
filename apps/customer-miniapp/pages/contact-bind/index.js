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
Page({
    data: {
        submitting: false,
        statusText: '等待绑定手机号',
        manualPhone: '',
        manualCountryCode: '+86'
    },
    handleManualPhoneInput(event) {
        var _a, _b;
        this.setData({ manualPhone: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    async handleWechatPhone(event) {
        var _a, _b;
        this.setData({ submitting: true, statusText: '正在获取微信手机号' });
        await this.commit(async () => { var _a; return (0, phone_1.requestWechatPhone)((_a = event.detail) !== null && _a !== void 0 ? _a : {}); }, maskPhone(String((_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.phoneNumber) !== null && _b !== void 0 ? _b : '')));
    },
    async handleManualSubmit() {
        const { manualPhone, manualCountryCode } = this.data;
        this.setData({ submitting: true, statusText: '正在提交手动补录' });
        await this.commit(async () => (0, phone_1.submitManualPhone)({
            phoneNumber: manualPhone,
            countryCode: manualCountryCode
        }), maskPhone(manualPhone.replace(/\s+/g, '')));
    },
    async commit(action, fallbackMaskedPhone = '') {
        var _a, _b;
        try {
            const result = (await action());
            (0, profile_1.updateProfile)({
                contactPhoneMasked: (_b = (_a = result.update) === null || _a === void 0 ? void 0 : _a.contactPhoneMasked) !== null && _b !== void 0 ? _b : fallbackMaskedPhone
            });
            this.setData({ submitting: false, statusText: '联系方式已安全保存' });
        }
        catch (error) {
            console.error('contact bind failed', error);
            this.setData({
                submitting: false,
                statusText: `身份同步失败：${error instanceof Error ? error.message : '请下拉重试'}`
            });
        }
    }
});
