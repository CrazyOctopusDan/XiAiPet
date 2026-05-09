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
        statusTone: 'idle',
        privacyAuthorizationRequired: false,
        privacyContractName: '隐私保护指引',
        manualPhone: '',
        manualCountryCode: '+86'
    },
    onShow() {
        var _a;
        (_a = wx.getPrivacySetting) === null || _a === void 0 ? void 0 : _a.call(wx, {
            success: (result) => {
                this.setData({
                    privacyAuthorizationRequired: Boolean(result.needAuthorization),
                    privacyContractName: result.privacyContractName || '隐私保护指引'
                });
            }
        });
    },
    handleManualPhoneInput(event) {
        var _a, _b;
        this.setData({ manualPhone: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    handleAgreePrivacyAuthorization() {
        if (wx.requirePrivacyAuthorize) {
            wx.requirePrivacyAuthorize({
                success: () => {
                    this.setData({
                        privacyAuthorizationRequired: false,
                        statusText: '已同意隐私保护指引，可以继续获取微信手机号',
                        statusTone: 'success'
                    });
                },
                fail: () => {
                    this.setData({
                        privacyAuthorizationRequired: true,
                        statusText: '请先同意隐私保护指引，再使用微信手机号',
                        statusTone: 'error'
                    });
                }
            });
            return;
        }
        this.setData({
            privacyAuthorizationRequired: false,
            statusText: '已同意隐私保护指引，可以继续获取微信手机号',
            statusTone: 'success'
        });
    },
    async handleWechatPhone(event) {
        var _a, _b, _c, _d, _e, _f, _g;
        const phoneNumber = String((_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.phoneNumber) !== null && _b !== void 0 ? _b : '');
        const phoneCode = String((_d = (_c = event.detail) === null || _c === void 0 ? void 0 : _c.code) !== null && _d !== void 0 ? _d : '');
        const errMsg = String((_f = (_e = event.detail) === null || _e === void 0 ? void 0 : _e.errMsg) !== null && _f !== void 0 ? _f : '');
        if (!phoneNumber && !phoneCode) {
            const statusText = resolveWechatPhoneFailureText(errMsg);
            this.setData({
                submitting: false,
                statusText,
                statusTone: 'error',
                privacyAuthorizationRequired: errMsg.includes('privacy') ? true : this.data.privacyAuthorizationRequired
            });
            (_g = wx.showToast) === null || _g === void 0 ? void 0 : _g.call(wx, {
                title: statusText.length > 18 ? '微信手机号授权失败' : statusText,
                icon: 'none'
            });
            return;
        }
        this.setData({ submitting: true, statusText: '正在获取微信手机号', statusTone: 'idle' });
        await this.commit(async () => { var _a; return (0, phone_1.requestWechatPhone)((_a = event.detail) !== null && _a !== void 0 ? _a : {}); }, maskPhone(phoneNumber));
    },
    async handleManualSubmit() {
        const { manualPhone, manualCountryCode } = this.data;
        this.setData({ submitting: true, statusText: '正在提交手动补录', statusTone: 'idle' });
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
            this.setData({ submitting: false, statusText: '联系方式已安全保存', statusTone: 'success' });
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
function resolveWechatPhoneFailureText(errMsg) {
    if (errMsg.includes('privacy')) {
        return '请先同意隐私保护指引，再使用微信手机号';
    }
    if (errMsg.includes('no permission') || errMsg.includes('has no permission')) {
        return '当前小程序账号未开通获取手机号权限';
    }
    if (errMsg.includes('deny') || errMsg.includes('cancel')) {
        return '你已取消微信手机号授权，可重新点击授权';
    }
    if (errMsg) {
        return `微信未返回手机号凭证：${errMsg}`;
    }
    return '微信未返回手机号凭证，请用真机预览并确认基础库版本';
}
