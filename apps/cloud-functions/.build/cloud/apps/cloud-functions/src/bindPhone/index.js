"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const shared_1 = require("@xiaipet/shared");
const auth_context_1 = require("../shared/auth-context");
const env_1 = require("../shared/env");
async function main(event = {}, context) {
    (0, env_1.resolveRuntimeEnv)();
    const auth = (0, auth_context_1.getAuthContext)(event, context);
    if (!(0, shared_1.isPhoneBindingInput)(event.payload)) {
        throw new Error('Invalid phone binding payload');
    }
    const normalized = (0, shared_1.normalizePhoneBinding)(event.payload);
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
