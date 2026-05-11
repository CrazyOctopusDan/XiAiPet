"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestWechatPhone = requestWechatPhone;
exports.submitManualPhone = submitManualPhone;
const api_client_1 = require("./api-client");
function normalizeSubmission(input) {
    return {
        phoneNumber: input.phoneNumber.replace(/\s+/g, ''),
        countryCode: input.countryCode.startsWith('+') ? input.countryCode : `+${input.countryCode}`
    };
}
async function requestWechatPhone(detail, request = api_client_1.customerApiRequest) {
    var _a, _b, _c;
    const phoneNumber = String((_a = detail.phoneNumber) !== null && _a !== void 0 ? _a : '');
    const phoneCode = String((_b = detail.code) !== null && _b !== void 0 ? _b : '');
    const body = phoneNumber
        ? {
            payload: {
                phoneNumber,
                countryCode: String((_c = detail.countryCode) !== null && _c !== void 0 ? _c : '+86'),
                source: 'wechat'
            }
        }
        : {
            phoneCode
        };
    return request('/api/v1/customer/profile/phone', {
        method: 'POST',
        body,
        auth: 'customer'
    });
}
async function submitManualPhone(input, request = api_client_1.customerApiRequest) {
    const normalized = normalizeSubmission(input);
    return request('/api/v1/customer/profile/phone', {
        method: 'POST',
        body: {
            payload: {
                ...normalized,
                source: 'manual',
                phoneBindingState: 'bound',
                contactPhoneMasked: '',
                contactPhoneCountryCode: normalized.countryCode
            }
        },
        auth: 'customer'
    });
}
