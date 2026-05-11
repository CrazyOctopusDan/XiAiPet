"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantApiError = exports.MERCHANT_SESSION_STORAGE_KEY = void 0;
exports.clearMerchantSession = clearMerchantSession;
exports.getMerchantSession = getMerchantSession;
exports.merchantLogin = merchantLogin;
exports.merchantApiRequest = merchantApiRequest;
const api_config_1 = require("./api-config");
exports.MERCHANT_SESSION_STORAGE_KEY = 'xiaipet.merchant.apiSession';
const MERCHANT_AUTH_LOGIN_PATH = '/api/v1/customer/auth/login';
const SESSION_EXPIRY_SKEW_MS = 30000;
class MerchantApiError extends Error {
    constructor(code, message, statusCode = 0, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.MerchantApiError = MerchantApiError;
function getWxApi() {
    if (typeof wx === 'undefined') {
        throw new MerchantApiError('WX_UNAVAILABLE', 'WeChat API is unavailable');
    }
    return wx;
}
function withQueryString(path, query) {
    const entries = Object.entries(query !== null && query !== void 0 ? query : {}).filter(([, value]) => value !== undefined && value !== null);
    if (!entries.length) {
        return path;
    }
    const search = entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
    return `${path}${path.includes('?') ? '&' : '?'}${search}`;
}
function buildUrl(path, query) {
    if (/^https?:\/\//.test(path)) {
        return withQueryString(path, query);
    }
    return `${(0, api_config_1.getMerchantApiBaseUrl)()}${withQueryString(path.startsWith('/') ? path : `/${path}`, query)}`;
}
function requestWithWx(input) {
    const wxApi = getWxApi();
    return new Promise((resolve, reject) => {
        wxApi.request({
            url: input.url,
            method: input.method,
            data: input.body,
            header: input.headers,
            success: resolve,
            fail: reject
        });
    });
}
function readMerchantSession() {
    var _a, _b;
    try {
        const value = (_b = (_a = getWxApi()).getStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, exports.MERCHANT_SESSION_STORAGE_KEY);
        if (!value || typeof value !== 'object' || typeof value.token !== 'string') {
            return null;
        }
        return value;
    }
    catch (_c) {
        return null;
    }
}
function writeMerchantSession(session) {
    var _a, _b;
    (_b = (_a = getWxApi()).setStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, exports.MERCHANT_SESSION_STORAGE_KEY, session);
}
function clearMerchantSession() {
    var _a, _b;
    try {
        (_b = (_a = getWxApi()).removeStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, exports.MERCHANT_SESSION_STORAGE_KEY);
    }
    catch (_c) {
        // Best effort cleanup only.
    }
}
function getMerchantSession() {
    return readMerchantSession();
}
function isSessionUsable(session) {
    if (!(session === null || session === void 0 ? void 0 : session.token) || !session.expiresAt) {
        return false;
    }
    return Date.parse(session.expiresAt) - SESSION_EXPIRY_SKEW_MS > Date.now();
}
function normalizeRequestFailure(error) {
    if (error instanceof MerchantApiError) {
        return error;
    }
    const message = typeof error === 'object' && error !== null && 'errMsg' in error
        ? String(error.errMsg)
        : 'Request failed';
    return new MerchantApiError('REQUEST_FAILED', message, 0, error);
}
async function sendMerchantApiRequest(path, options, token) {
    var _a, _b, _c, _d, _e, _f;
    const headers = {
        'content-type': 'application/json',
        ...((_a = options.headers) !== null && _a !== void 0 ? _a : {})
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    let response;
    try {
        response = await requestWithWx({
            url: buildUrl(path, options.query),
            method: (_b = options.method) !== null && _b !== void 0 ? _b : 'GET',
            headers,
            body: options.body
        });
    }
    catch (error) {
        throw normalizeRequestFailure(error);
    }
    const data = response.data;
    if (response.statusCode >= 200 && response.statusCode < 300) {
        if (data && typeof data === 'object' && data.ok === false) {
            throw new MerchantApiError((_c = data.code) !== null && _c !== void 0 ? _c : 'API_ERROR', (_d = data.message) !== null && _d !== void 0 ? _d : 'API request failed', response.statusCode, data);
        }
        return data;
    }
    const errorBody = data;
    throw new MerchantApiError((_e = errorBody === null || errorBody === void 0 ? void 0 : errorBody.code) !== null && _e !== void 0 ? _e : `HTTP_${response.statusCode}`, (_f = errorBody === null || errorBody === void 0 ? void 0 : errorBody.message) !== null && _f !== void 0 ? _f : 'API request failed', response.statusCode, data);
}
async function merchantLogin() {
    const loginResult = await getWxApi().login();
    if (!(loginResult === null || loginResult === void 0 ? void 0 : loginResult.code)) {
        throw new MerchantApiError('INVALID_LOGIN_CODE', 'wx.login did not return a code', 400);
    }
    try {
        const response = await sendMerchantApiRequest(MERCHANT_AUTH_LOGIN_PATH, {
            method: 'POST',
            body: {
                code: loginResult.code
            },
            auth: 'none',
            retryOnUnauthorized: false
        });
        const session = {
            token: response.token,
            expiresAt: response.expiresAt,
            openid: response.openid
        };
        writeMerchantSession(session);
        return session;
    }
    catch (error) {
        clearMerchantSession();
        throw error;
    }
}
async function ensureMerchantSession() {
    const existingSession = readMerchantSession();
    if (isSessionUsable(existingSession)) {
        return existingSession;
    }
    return merchantLogin();
}
async function merchantApiRequest(path, options = {}) {
    var _a;
    const authMode = (_a = options.auth) !== null && _a !== void 0 ? _a : 'merchant';
    const session = authMode === 'none' ? null : await ensureMerchantSession();
    try {
        return await sendMerchantApiRequest(path, options, session === null || session === void 0 ? void 0 : session.token);
    }
    catch (error) {
        if (error instanceof MerchantApiError &&
            error.statusCode === 401 &&
            authMode !== 'none' &&
            options.retryOnUnauthorized !== false) {
            clearMerchantSession();
            const nextSession = await merchantLogin();
            return sendMerchantApiRequest(path, options, nextSession.token);
        }
        throw error;
    }
}
