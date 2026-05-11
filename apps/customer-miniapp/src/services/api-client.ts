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
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(options.headers ?? {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: WxRequestResponse<T | ApiErrorBody>;
  try {
    response = await requestWithWx<T | ApiErrorBody>({
      url: buildUrl(path, options.query),
      method: options.method ?? 'GET',
      headers,
      body: options.body
    });
  } catch (error) {
    throw normalizeRequestFailure(error);
  }

  const data = response.data;
  if (response.statusCode >= 200 && response.statusCode < 300) {
    if (data && typeof data === 'object' && (data as ApiErrorBody).ok === false) {
      throw new CustomerApiError(
        (data as ApiErrorBody).code ?? 'API_ERROR',
        (data as ApiErrorBody).message ?? 'API request failed',
        response.statusCode,
        data
      );
    }
    return data as T;
  }

  const errorBody = data as ApiErrorBody | undefined;
  throw new CustomerApiError(
    errorBody?.code ?? `HTTP_${response.statusCode}`,
    errorBody?.message ?? 'API request failed',
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
