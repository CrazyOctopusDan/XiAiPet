import { getCustomerApiBaseUrl } from './api-config';

declare const wx: any;

export type CustomerApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type CustomerApiAuthMode = 'none' | 'customer';

export interface CustomerApiRequestOptions {
  method?: CustomerApiMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  auth?: CustomerApiAuthMode;
  retryOnUnauthorized?: boolean;
}

export type CustomerApiRequester = <T>(
  path: string,
  options?: CustomerApiRequestOptions
) => Promise<T>;

export interface CustomerApiSession {
  token: string;
  expiresAt: string;
  openid?: string;
}

interface CustomerLoginResponse {
  ok: boolean;
  token: string;
  expiresAt: string;
  openid?: string;
}

interface WxRequestResponse<T> {
  statusCode: number;
  data?: T;
}

interface ApiErrorBody {
  ok?: false;
  code?: string;
  message?: string;
}

export const CUSTOMER_SESSION_STORAGE_KEY = 'xiaipet.customer.apiSession';
const CUSTOMER_AUTH_LOGIN_PATH = '/api/v1/customer/auth/login';
const SESSION_EXPIRY_SKEW_MS = 30_000;
const CUSTOMER_API_ERROR_MESSAGES: Record<string, string> = {
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

export class CustomerApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 0,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

function normalizeApiErrorCode(value?: string) {
  return value?.trim().replace(/\s+/g, '_').toUpperCase() ?? '';
}

function isMachineReadableMessage(value: string) {
  const message = value.trim();
  return /^[A-Z0-9_ ]+$/.test(message) || (message.includes('_') && /^[A-Za-z0-9_]+$/.test(message));
}

export function getCustomerApiErrorMessage(
  code?: string,
  message?: string,
  fallback = '请求失败，请稍后重试'
) {
  const knownMessage = CUSTOMER_API_ERROR_MESSAGES[normalizeApiErrorCode(code)]
    ?? CUSTOMER_API_ERROR_MESSAGES[normalizeApiErrorCode(message)];
  if (knownMessage) {
    return knownMessage;
  }

  const trimmedMessage = message?.trim();
  if (trimmedMessage && !isMachineReadableMessage(trimmedMessage)) {
    return trimmedMessage;
  }

  const trimmedCode = code?.trim();
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

function withQueryString(path: string, query?: CustomerApiRequestOptions['query']): string {
  const entries = Object.entries(query ?? {}).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) {
    return path;
  }

  const search = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${path}${path.includes('?') ? '&' : '?'}${search}`;
}

function buildUrl(path: string, query?: CustomerApiRequestOptions['query']): string {
  if (/^https?:\/\//.test(path)) {
    return withQueryString(path, query);
  }

  return `${getCustomerApiBaseUrl()}${withQueryString(path.startsWith('/') ? path : `/${path}`, query)}`;
}

function requestWithWx<T>(input: {
  url: string;
  method: CustomerApiMethod;
  headers: Record<string, string>;
  body?: unknown;
}): Promise<WxRequestResponse<T>> {
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

function readCustomerSession(): CustomerApiSession | null {
  try {
    const value = getWxApi().getStorageSync?.(CUSTOMER_SESSION_STORAGE_KEY);
    if (!value || typeof value !== 'object' || typeof value.token !== 'string') {
      return null;
    }
    return value as CustomerApiSession;
  } catch {
    return null;
  }
}

function writeCustomerSession(session: CustomerApiSession) {
  getWxApi().setStorageSync?.(CUSTOMER_SESSION_STORAGE_KEY, session);
}

export function clearCustomerSession() {
  try {
    getWxApi().removeStorageSync?.(CUSTOMER_SESSION_STORAGE_KEY);
  } catch {
    // Best effort cleanup only.
  }
}

export function getCustomerSession(): CustomerApiSession | null {
  return readCustomerSession();
}

function isSessionUsable(session: CustomerApiSession | null): session is CustomerApiSession {
  if (!session?.token || !session.expiresAt) {
    return false;
  }
  return Date.parse(session.expiresAt) - SESSION_EXPIRY_SKEW_MS > Date.now();
}

function normalizeRequestFailure(error: unknown): CustomerApiError {
  if (error instanceof CustomerApiError) {
    return error;
  }
  const message =
    typeof error === 'object' && error !== null && 'errMsg' in error
      ? String((error as { errMsg?: unknown }).errMsg)
      : 'Request failed';
  return new CustomerApiError('REQUEST_FAILED', message, 0, error);
}

async function sendCustomerApiRequest<T>(
  path: string,
  options: CustomerApiRequestOptions,
  token?: string
): Promise<T> {
  const method = options.method ?? 'GET';
  const body = options.body === undefined && method !== 'GET' ? {} : options.body;
  const headers: Record<string, string> = {
    ...(options.headers ?? {})
  };
  if (body !== undefined && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: WxRequestResponse<T | ApiErrorBody>;
  try {
    response = await requestWithWx<T | ApiErrorBody>({
      url: buildUrl(path, options.query),
      method,
      headers,
      body
    });
  } catch (error) {
    throw normalizeRequestFailure(error);
  }

  const data = response.data;
  if (response.statusCode >= 200 && response.statusCode < 300) {
    if (data && typeof data === 'object' && (data as ApiErrorBody).ok === false) {
      const errorBody = data as ApiErrorBody;
      throw new CustomerApiError(
        errorBody.code ?? 'API_ERROR',
        getCustomerApiErrorMessage(errorBody.code, errorBody.message),
        response.statusCode,
        data
      );
    }
    return data as T;
  }

  const errorBody = data as ApiErrorBody | undefined;
  throw new CustomerApiError(
    errorBody?.code ?? `HTTP_${response.statusCode}`,
    getCustomerApiErrorMessage(errorBody?.code, errorBody?.message),
    response.statusCode,
    data
  );
}

export async function customerLogin(): Promise<CustomerApiSession> {
  const loginResult = await getWxApi().login();
  if (!loginResult?.code) {
    throw new CustomerApiError('INVALID_LOGIN_CODE', 'wx.login did not return a code', 400);
  }

  const response = await sendCustomerApiRequest<CustomerLoginResponse>(
    CUSTOMER_AUTH_LOGIN_PATH,
    {
      method: 'POST',
      body: {
        code: loginResult.code
      },
      auth: 'none',
      retryOnUnauthorized: false
    }
  );

  const session: CustomerApiSession = {
    token: response.token,
    expiresAt: response.expiresAt,
    openid: response.openid
  };
  writeCustomerSession(session);
  return session;
}

async function ensureCustomerSession(): Promise<CustomerApiSession> {
  const existingSession = readCustomerSession();
  if (isSessionUsable(existingSession)) {
    return existingSession;
  }

  return customerLogin();
}

export async function customerApiRequest<T>(
  path: string,
  options: CustomerApiRequestOptions = {}
): Promise<T> {
  const authMode = options.auth ?? 'customer';
  const session = authMode === 'customer' ? await ensureCustomerSession() : null;

  try {
    return await sendCustomerApiRequest<T>(path, options, session?.token);
  } catch (error) {
    if (
      error instanceof CustomerApiError &&
      error.statusCode === 401 &&
      authMode === 'customer' &&
      options.retryOnUnauthorized !== false
    ) {
      clearCustomerSession();
      const nextSession = await customerLogin();
      return sendCustomerApiRequest<T>(path, options, nextSession.token);
    }

    throw error;
  }
}
