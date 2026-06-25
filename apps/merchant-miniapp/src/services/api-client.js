"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantApiError = exports.MERCHANT_SESSION_STORAGE_KEY = void 0;
exports.clearMerchantSession = clearMerchantSession;
exports.getMerchantSession = getMerchantSession;
exports.isMerchantSessionUsable = isMerchantSessionUsable;
exports.merchantLogin = merchantLogin;
exports.merchantLogout = merchantLogout;
exports.changeMerchantPassword = changeMerchantPassword;
exports.merchantApiRequest = merchantApiRequest;
const api_config_1 = require("./api-config");
exports.MERCHANT_SESSION_STORAGE_KEY = 'xiaipet.merchant.apiSession';
const MERCHANT_AUTH_LOGIN_PATH = '/api/v1/merchant/auth/login';
const SESSION_EXPIRY_SKEW_MS = 30000;
const MERCHANT_API_ERROR_MESSAGES = {
    REQUEST_FAILED: '网络请求失败，请检查网络后重试',
    UNAUTHORIZED: '登录已过期，请重新登录',
    MERCHANT_FORBIDDEN: '当前账号没有商户权限',
    MERCHANT_LOGIN_REQUIRED: '请先登录商户账号',
    INCOMPATIBLE_FULFILLMENT: '所选商品不支持当前履约方式，请重新选择',
    DELIVERY_MINIMUM_NOT_MET: '未达到配送起送金额',
    DELIVERY_OUT_OF_RANGE: '超出配送范围',
    ORDER_PRODUCT_UNAVAILABLE: '商品已下架，请重新选择',
    ORDER_SPEC_UNAVAILABLE: '商品规格已调整，请重新选择',
    ORDER_STOCK_UNAVAILABLE: '商品库存不足，去看看别的商品吧',
    ORDER_GIFT_UNAVAILABLE: '赠品状态已变化，请重新选择',
    INSUFFICIENT_BALANCE: '余额不足'
};
class MerchantApiError extends Error {
    constructor(code, message, statusCode = 0, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.MerchantApiError = MerchantApiError;
function normalizeApiErrorCode(value) {
    var _a;
    return (_a = value === null || value === void 0 ? void 0 : value.trim().replace(/\s+/g, '_').toUpperCase()) !== null && _a !== void 0 ? _a : '';
}
function isMachineReadableMessage(value) {
    const message = value.trim();
    return /^[A-Z0-9_ ]+$/.test(message) || (message.includes('_') && /^[A-Za-z0-9_]+$/.test(message));
}
function getMerchantApiErrorMessage(code, message, fallback = '请求失败，请稍后重试') {
    var _a;
    const knownMessage = (_a = MERCHANT_API_ERROR_MESSAGES[normalizeApiErrorCode(code)]) !== null && _a !== void 0 ? _a : MERCHANT_API_ERROR_MESSAGES[normalizeApiErrorCode(message)];
    if (knownMessage) {
        return knownMessage;
    }
    const trimmedMessage = message === null || message === void 0 ? void 0 : message.trim();
    if (trimmedMessage && !isMachineReadableMessage(trimmedMessage)) {
        return trimmedMessage;
    }
    const trimmedCode = code === null || code === void 0 ? void 0 : code.trim();
    if (trimmedCode && !isMachineReadableMessage(trimmedCode)) {
        return trimmedCode;
    }
    return fallback;
}
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
function isMerchantSessionUsable(session = readMerchantSession()) {
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
    var _a, _b, _c, _d;
    const method = (_a = options.method) !== null && _a !== void 0 ? _a : 'GET';
    const body = options.body === undefined && method !== 'GET' ? {} : options.body;
    const headers = {
        ...((_b = options.headers) !== null && _b !== void 0 ? _b : {})
    };
    if (body !== undefined && !headers['content-type']) {
        headers['content-type'] = 'application/json';
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    let response;
    try {
        response = await requestWithWx({
            url: buildUrl(path, options.query),
            method,
            headers,
            body
        });
    }
    catch (error) {
        throw normalizeRequestFailure(error);
    }
    const data = response.data;
    if (response.statusCode >= 200 && response.statusCode < 300) {
        if (data && typeof data === 'object' && data.ok === false) {
            const errorBody = data;
            throw new MerchantApiError((_c = errorBody.code) !== null && _c !== void 0 ? _c : 'API_ERROR', getMerchantApiErrorMessage(errorBody.code, errorBody.message), response.statusCode, data);
        }
        return data;
    }
    const errorBody = data;
    throw new MerchantApiError((_d = errorBody === null || errorBody === void 0 ? void 0 : errorBody.code) !== null && _d !== void 0 ? _d : `HTTP_${response.statusCode}`, getMerchantApiErrorMessage(errorBody === null || errorBody === void 0 ? void 0 : errorBody.code, errorBody === null || errorBody === void 0 ? void 0 : errorBody.message), response.statusCode, data);
}
async function merchantLogin(credentials) {
    var _a;
    if (!((_a = credentials.username) === null || _a === void 0 ? void 0 : _a.trim()) || !credentials.password) {
        throw new MerchantApiError('INVALID_MERCHANT_CREDENTIALS', '请输入账号和密码', 400);
    }
    try {
        const response = await sendMerchantApiRequest(MERCHANT_AUTH_LOGIN_PATH, {
            method: 'POST',
            body: {
                username: credentials.username.trim(),
                password: credentials.password
            },
            auth: 'none',
            retryOnUnauthorized: false
        });
        const session = {
            token: response.token,
            expiresAt: response.expiresAt,
            account: response.account
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
    if (isMerchantSessionUsable(existingSession)) {
        return existingSession;
    }
    clearMerchantSession();
    throw new MerchantApiError('MERCHANT_LOGIN_REQUIRED', '请先登录商户账号', 401);
}
function merchantLogout() {
    clearMerchantSession();
}
async function changeMerchantPassword(input) {
    const response = await merchantApiRequest('/api/v1/merchant/auth/change-password', {
        method: 'POST',
        body: input,
        auth: 'merchant',
        retryOnUnauthorized: false
    });
    const session = {
        token: response.token,
        expiresAt: response.expiresAt,
        account: response.account
    };
    writeMerchantSession(session);
    return session;
}
async function merchantApiRequest(path, options = {}) {
    var _a;
    const authMode = (_a = options.auth) !== null && _a !== void 0 ? _a : 'merchant';
    if (authMode !== 'none' && authMode !== 'merchant') {
        throw new MerchantApiError('INVALID_AUTH_MODE', 'Merchant API requests only support merchant auth', 400);
    }
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
        }
        throw error;
    }
}
