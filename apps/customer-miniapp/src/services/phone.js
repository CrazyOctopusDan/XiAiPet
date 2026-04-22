"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestWechatPhone = requestWechatPhone;
exports.submitManualPhone = submitManualPhone;
function normalizeSubmission(input) {
    return {
        phoneNumber: input.phoneNumber.replace(/\s+/g, ''),
        countryCode: input.countryCode.startsWith('+') ? input.countryCode : `+${input.countryCode}`
    };
}
async function requestWechatPhone(detail) {
    var _a, _b;
    const response = (await wx.cloud.callFunction({
        name: 'bindPhone',
        data: {
            payload: {
                phoneNumber: String((_a = detail.phoneNumber) !== null && _a !== void 0 ? _a : ''),
                countryCode: String((_b = detail.countryCode) !== null && _b !== void 0 ? _b : '+86'),
                source: 'wechat'
            }
        }
    }));
    return response.result;
}
async function submitManualPhone(input) {
    const normalized = normalizeSubmission(input);
    const response = (await wx.cloud.callFunction({
        name: 'bindPhone',
        data: {
            payload: {
                ...normalized,
                source: 'manual',
                phoneBindingState: 'bound',
                contactPhoneMasked: '',
                contactPhoneCountryCode: normalized.countryCode
            }
        }
    }));
    return response.result;
}
