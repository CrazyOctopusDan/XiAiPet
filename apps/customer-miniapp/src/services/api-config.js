"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOMER_API_BASE_URL = exports.CUSTOMER_API_DEVELOPMENT_BASE_URL = exports.CUSTOMER_API_PRODUCTION_BASE_URL = void 0;
exports.getCustomerApiBaseUrl = getCustomerApiBaseUrl;
const CUSTOMER_API_BASE_URL_OVERRIDE_KEY = '__XIAIPET_CUSTOMER_API_BASE_URL__';
exports.CUSTOMER_API_PRODUCTION_BASE_URL = 'https://api.xiaipet.vip';
exports.CUSTOMER_API_DEVELOPMENT_BASE_URL = exports.CUSTOMER_API_PRODUCTION_BASE_URL;
function trimTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}
function getCustomerApiBaseUrl() {
    var _a, _b, _c, _d;
    const override = (_a = globalThis[CUSTOMER_API_BASE_URL_OVERRIDE_KEY]) === null || _a === void 0 ? void 0 : _a.trim();
    if (override) {
        return trimTrailingSlash(override);
    }
    const envVersion = typeof wx === 'undefined' ? undefined : (_d = (_c = (_b = wx.getAccountInfoSync) === null || _b === void 0 ? void 0 : _b.call(wx)) === null || _c === void 0 ? void 0 : _c.miniProgram) === null || _d === void 0 ? void 0 : _d.envVersion;
    return envVersion === 'release' ? exports.CUSTOMER_API_PRODUCTION_BASE_URL : exports.CUSTOMER_API_DEVELOPMENT_BASE_URL;
}
exports.CUSTOMER_API_BASE_URL = getCustomerApiBaseUrl();
