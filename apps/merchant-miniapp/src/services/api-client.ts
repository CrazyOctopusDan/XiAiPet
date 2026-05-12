import { getMerchantApiBaseUrl } from './api-config';

declare const wx: any;

export type MerchantApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type MerchantApiAuthMode = 'none' | 'customer' | 'merchant';

export interface MerchantApiRequestOptions {
  method?: MerchantApiMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  auth?: MerchantApiAuthMode;
  retryOnUnauthorized?: boolean;
}

export type MerchantApiRequester = <T>(path: string, options?: MerchantApiRequestOptions) => Promise<T>;

export interface MerchantApiSession {
  token: string;
  expiresAt: string;
  openid?: string;
}

interface MerchantLoginResponse {
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

export const MERCHANT_SESSION_STORAGE_KEY = 'xiaipet.merchant.apiSession';
const MERCHANT_AUTH_LOGIN_PATH = '/api/v1/merchant/auth/login';
const SESSION_EXPIRY_SKEW_MS = 30_000;

export class MerchantApiError extends Error {
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
    throw new MerchantApiError('WX_UNAVAILABLE', 'WeChat API is unavailable');
  }
  return wx;
}

function withQueryString(path: string, query?: MerchantApiRequestOptions['query']): string {
  const entries = Object.entries(query ?? {}).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) {
    return path;
  }

  const search = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${path}${path.includes('?') ? '&' : '?'}${search}`;
}

function buildUrl(path: string, query?: MerchantApiRequestOptions['query']): string {
  if (/^https?:\/\//.test(path)) {
    return withQueryString(path, query);
  }

  return `${getMerchantApiBaseUrl()}${withQueryString(path.startsWith('/') ? path : `/${path}`, query)}`;
}

function requestWithWx<T>(input: {
  url: string;
  method: MerchantApiMethod;
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

function readMerchantSession(): MerchantApiSession | null {
  try {
    const value = getWxApi().getStorageSync?.(MERCHANT_SESSION_STORAGE_KEY);
    if (!value || typeof value !== 'object' || typeof value.token !== 'string') {
      return null;
    }
    return value as MerchantApiSession;
  } catch {
    return null;
  }
}

function writeMerchantSession(session: MerchantApiSession) {
  getWxApi().setStorageSync?.(MERCHANT_SESSION_STORAGE_KEY, session);
}

export function clearMerchantSession() {
  try {
    getWxApi().removeStorageSync?.(MERCHANT_SESSION_STORAGE_KEY);
  } catch {
    // Best effort cleanup only.
  }
}

export function getMerchantSession(): MerchantApiSession | null {
  return readMerchantSession();
}

function isSessionUsable(session: MerchantApiSession | null): session is MerchantApiSession {
  if (!session?.token || !session.expiresAt) {
    return false;
  }
  return Date.parse(session.expiresAt) - SESSION_EXPIRY_SKEW_MS > Date.now();
}

function normalizeRequestFailure(error: unknown): MerchantApiError {
  if (error instanceof MerchantApiError) {
    return error;
  }
  const message =
    typeof error === 'object' && error !== null && 'errMsg' in error
      ? String((error as { errMsg?: unknown }).errMsg)
      : 'Request failed';
  return new MerchantApiError('REQUEST_FAILED', message, 0, error);
}

async function sendMerchantApiRequest<T>(
  path: string,
  options: MerchantApiRequestOptions,
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
      throw new MerchantApiError(
        (data as ApiErrorBody).code ?? 'API_ERROR',
        (data as ApiErrorBody).message ?? 'API request failed',
        response.statusCode,
        data
      );
    }
    return data as T;
  }

  const errorBody = data as ApiErrorBody | undefined;
  throw new MerchantApiError(
    errorBody?.code ?? `HTTP_${response.statusCode}`,
    errorBody?.message ?? 'API request failed',
    response.statusCode,
    data
  );
}

export async function merchantLogin(): Promise<MerchantApiSession> {
  const loginResult = await getWxApi().login();
  if (!loginResult?.code) {
    throw new MerchantApiError('INVALID_LOGIN_CODE', 'wx.login did not return a code', 400);
  }

  try {
    const response = await sendMerchantApiRequest<MerchantLoginResponse>(
      MERCHANT_AUTH_LOGIN_PATH,
      {
        method: 'POST',
        body: {
          code: loginResult.code
        },
        auth: 'none',
        retryOnUnauthorized: false
      }
    );

    const session: MerchantApiSession = {
      token: response.token,
      expiresAt: response.expiresAt,
      openid: response.openid
    };
    writeMerchantSession(session);
    return session;
  } catch (error) {
    clearMerchantSession();
    throw error;
  }
}

async function ensureMerchantSession(): Promise<MerchantApiSession> {
  const existingSession = readMerchantSession();
  if (isSessionUsable(existingSession)) {
    return existingSession;
  }

  return merchantLogin();
}

export async function merchantApiRequest<T>(
  path: string,
  options: MerchantApiRequestOptions = {}
): Promise<T> {
  const authMode = options.auth ?? 'merchant';
  const session = authMode === 'none' ? null : await ensureMerchantSession();

  try {
    return await sendMerchantApiRequest<T>(path, options, session?.token);
  } catch (error) {
    if (
      error instanceof MerchantApiError &&
      error.statusCode === 401 &&
      authMode !== 'none' &&
      options.retryOnUnauthorized !== false
    ) {
      clearMerchantSession();
      const nextSession = await merchantLogin();
      return sendMerchantApiRequest<T>(path, options, nextSession.token);
    }

    throw error;
  }
}
