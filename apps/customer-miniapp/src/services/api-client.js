"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerApiError = exports.CUSTOMER_SESSION_STORAGE_KEY = void 0;
exports.getCustomerApiErrorMessage = getCustomerApiErrorMessage;
exports.clearCustomerSession = clearCustomerSession;
exports.getCustomerSession = getCustomerSession;
exports.customerLogin = customerLogin;
exports.customerApiRequest = customerApiRequest;
const api_config_1 = require("./api-config");
exports.CUSTOMER_SESSION_STORAGE_KEY = 'xiaipet.customer.apiSession';
const CUSTOMER_AUTH_LOGIN_PATH = '/api/v1/customer/auth/login';
const SESSION_EXPIRY_SKEW_MS = 30000;
const CUSTOMER_API_ERROR_MESSAGES = {
    REQUEST_FAILED: '网络请求失败，请检查网络后重试',
    CUSTOMER_NOT_REGISTERED: '请先绑定手机号后再下单',
    INCOMPATIBLE_FULFILLMENT: '所选商品不支持当前履约方式，请重新选择',
    DELIVERY_MINIMUM_NOT_MET: '未达到配送起送金额',
    DELIVERY_OUT_OF_RANGE: '超出配送范围',
    ORDER_PRODUCT_UNAVAILABLE: '商品已下架，请重新选择',
    ORDER_SPEC_UNAVAILABLE: '商品规格已调整，请重新选择',
    ORDER_STOCK_UNAVAILABLE: '商品库存不足，去看看别的商品吧',
    ORDER_GIFT_UNAVAILABLE: '赠品状态已变化，请重新选择',
    INSUFFICIENT_BALANCE: '余额不足',
    WECHAT_PAY_NOT_CONFIGURED: '微信支付暂未配置',
    WECHAT_PAY_UNAVAILABLE: '当前环境暂不支持微信支付',
    WECHAT_PAY_CANCELLED: '支付已取消',
    CREATE_ORDER_FAILED: '下单失败，请稍后重试',
    PAY_ORDER_FAILED: '支付发起失败，请稍后重试',
    SUBMIT_ORDER_FAILED: '下单失败，请稍后重试',
    MISSING_PAID_ORDER: '支付结果异常，请稍后查看订单',
    SYNC_PAYMENT_FAILED: '支付结果同步失败，请稍后查看订单'
};
class CustomerApiError extends Error {
    constructor(code, message, statusCode = 0, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.CustomerApiError = CustomerApiError;
function normalizeApiErrorCode(value) {
    var _a;
    return (_a = value === null || value === void 0 ? void 0 : value.trim().replace(/\s+/g, '_').toUpperCase()) !== null && _a !== void 0 ? _a : '';
}
function isMachineReadableMessage(value) {
    const message = value.trim();
    return /^[A-Z0-9_ ]+$/.test(message) || (message.includes('_') && /^[A-Za-z0-9_]+$/.test(message));
}
function getCustomerApiErrorMessage(code, message, fallback = '请求失败，请稍后重试') {
    var _a;
    const knownMessage = (_a = CUSTOMER_API_ERROR_MESSAGES[normalizeApiErrorCode(code)]) !== null && _a !== void 0 ? _a : CUSTOMER_API_ERROR_MESSAGES[normalizeApiErrorCode(message)];
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
        throw new CustomerApiError('WX_UNAVAILABLE', 'WeChat API is unavailable');
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
    return `${(0, api_config_1.getCustomerApiBaseUrl)()}${withQueryString(path.startsWith('/') ? path : `/${path}`, query)}`;
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
function readCustomerSession() {
    var _a, _b;
    try {
        const value = (_b = (_a = getWxApi()).getStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, exports.CUSTOMER_SESSION_STORAGE_KEY);
        if (!value || typeof value !== 'object' || typeof value.token !== 'string') {
            return null;
        }
        return value;
    }
    catch (_c) {
        return null;
    }
}
function writeCustomerSession(session) {
    var _a, _b;
    (_b = (_a = getWxApi()).setStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, exports.CUSTOMER_SESSION_STORAGE_KEY, session);
}
function clearCustomerSession() {
    var _a, _b;
    try {
        (_b = (_a = getWxApi()).removeStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, exports.CUSTOMER_SESSION_STORAGE_KEY);
    }
    catch (_c) {
        // Best effort cleanup only.
    }
}
function getCustomerSession() {
    return readCustomerSession();
}
function isSessionUsable(session) {
    if (!(session === null || session === void 0 ? void 0 : session.token) || !session.expiresAt) {
        return false;
    }
    return Date.parse(session.expiresAt) - SESSION_EXPIRY_SKEW_MS > Date.now();
}
function normalizeRequestFailure(error) {
    if (error instanceof CustomerApiError) {
        return error;
    }
    const message = typeof error === 'object' && error !== null && 'errMsg' in error
        ? String(error.errMsg)
        : 'Request failed';
    return new CustomerApiError('REQUEST_FAILED', message, 0, error);
}
async function sendCustomerApiRequest(path, options, token) {
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
            throw new CustomerApiError((_c = errorBody.code) !== null && _c !== void 0 ? _c : 'API_ERROR', getCustomerApiErrorMessage(errorBody.code, errorBody.message), response.statusCode, data);
        }
        return data;
    }
    const errorBody = data;
    throw new CustomerApiError((_d = errorBody === null || errorBody === void 0 ? void 0 : errorBody.code) !== null && _d !== void 0 ? _d : `HTTP_${response.statusCode}`, getCustomerApiErrorMessage(errorBody === null || errorBody === void 0 ? void 0 : errorBody.code, errorBody === null || errorBody === void 0 ? void 0 : errorBody.message), response.statusCode, data);
}
async function customerLogin() {
    const loginResult = await getWxApi().login();
    if (!(loginResult === null || loginResult === void 0 ? void 0 : loginResult.code)) {
        throw new CustomerApiError('INVALID_LOGIN_CODE', 'wx.login did not return a code', 400);
    }
    const response = await sendCustomerApiRequest(CUSTOMER_AUTH_LOGIN_PATH, {
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
    writeCustomerSession(session);
    return session;
}
async function ensureCustomerSession() {
    const existingSession = readCustomerSession();
    if (isSessionUsable(existingSession)) {
        return existingSession;
    }
    return customerLogin();
}
async function customerApiRequest(path, options = {}) {
    var _a;
    const authMode = (_a = options.auth) !== null && _a !== void 0 ? _a : 'customer';
    const session = authMode === 'customer' ? await ensureCustomerSession() : null;
    try {
        return await sendCustomerApiRequest(path, options, session === null || session === void 0 ? void 0 : session.token);
    }
    catch (error) {
        if (error instanceof CustomerApiError &&
            error.statusCode === 401 &&
            authMode === 'customer' &&
            options.retryOnUnauthorized !== false) {
            clearCustomerSession();
            const nextSession = await customerLogin();
            return sendCustomerApiRequest(path, options, nextSession.token);
        }
        throw error;
    }
}
