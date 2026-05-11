const CUSTOMER_API_BASE_URL_OVERRIDE_KEY = '__XIAIPET_CUSTOMER_API_BASE_URL__';

declare const wx: any;

export const CUSTOMER_API_PRODUCTION_BASE_URL = 'https://api.xiaipet.vip';
export const CUSTOMER_API_DEVELOPMENT_BASE_URL = 'http://127.0.0.1:3000';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getCustomerApiBaseUrl(): string {
  const override = (globalThis as unknown as Record<string, string | undefined>)[
    CUSTOMER_API_BASE_URL_OVERRIDE_KEY
  ]?.trim();
  if (override) {
    return trimTrailingSlash(override);
  }

  const envVersion =
    typeof wx === 'undefined' ? undefined : wx.getAccountInfoSync?.()?.miniProgram?.envVersion;

  return envVersion === 'release' ? CUSTOMER_API_PRODUCTION_BASE_URL : CUSTOMER_API_DEVELOPMENT_BASE_URL;
}

export const CUSTOMER_API_BASE_URL = getCustomerApiBaseUrl();
