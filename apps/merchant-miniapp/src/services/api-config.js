"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MERCHANT_API_BASE_URL = exports.MERCHANT_API_DEVELOPMENT_BASE_URL = exports.MERCHANT_API_PRODUCTION_BASE_URL = void 0;
exports.getMerchantApiBaseUrl = getMerchantApiBaseUrl;
const MERCHANT_API_BASE_URL_OVERRIDE_KEY = '__XIAIPET_MERCHANT_API_BASE_URL__';
exports.MERCHANT_API_PRODUCTION_BASE_URL = 'https://api.xiaipet.vip';
exports.MERCHANT_API_DEVELOPMENT_BASE_URL = 'http://118.178.173.241';
function trimTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}
function getMerchantApiBaseUrl() {
    var _a, _b, _c, _d;
    const override = (_a = globalThis[MERCHANT_API_BASE_URL_OVERRIDE_KEY]) === null || _a === void 0 ? void 0 : _a.trim();
    if (override) {
        return trimTrailingSlash(override);
    }
    const envVersion = typeof wx === 'undefined' ? undefined : (_d = (_c = (_b = wx.getAccountInfoSync) === null || _b === void 0 ? void 0 : _b.call(wx)) === null || _c === void 0 ? void 0 : _c.miniProgram) === null || _d === void 0 ? void 0 : _d.envVersion;
    return envVersion === 'release' ? exports.MERCHANT_API_PRODUCTION_BASE_URL : exports.MERCHANT_API_DEVELOPMENT_BASE_URL;
}
exports.MERCHANT_API_BASE_URL = getMerchantApiBaseUrl();
