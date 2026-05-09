"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const shared_1 = require("@xiaipet/shared");
const auth_context_1 = require("../shared/auth-context");
const env_1 = require("../shared/env");
function createWechatPhoneResolver() {
    return {
        async getPhoneNumber(code) {
            const cloud = require('wx-server-sdk');
            cloud.init?.();
            const result = await cloud.openapi?.phonenumber?.getPhoneNumber?.({ code });
            const phoneInfo = result?.phone_info;
            const phoneNumber = phoneInfo?.phoneNumber ?? phoneInfo?.purePhoneNumber ?? '';
            const countryCode = phoneInfo?.countryCode ? `+${phoneInfo.countryCode.replace(/^\+/, '')}` : '+86';
            if (!phoneNumber) {
                throw new Error('Wechat phone number not returned');
            }
            return {
                phoneNumber,
                countryCode,
                source: 'wechat'
            };
        }
    };
}
async function resolvePhoneBindingInput(event, resolver) {
    if ((0, shared_1.isPhoneBindingInput)(event.payload)) {
        return event.payload;
    }
    if (event.phoneCode) {
        return resolver.getPhoneNumber(event.phoneCode);
    }
    throw new Error('Invalid phone binding payload');
}
async function main(event = {}, context, resolver = createWechatPhoneResolver()) {
    (0, env_1.resolveRuntimeEnv)();
    const auth = (0, auth_context_1.getAuthContext)(event, context);
    const input = await resolvePhoneBindingInput(event, resolver);
    const normalized = (0, shared_1.normalizePhoneBinding)(input);
    return {
        ok: true,
        openid: auth.openid,
        update: {
            phoneBindingState: 'bound',
            contactPhoneMasked: normalized.maskedPhone,
            contactPhoneCountryCode: normalized.countryCode
        }
    };
}
