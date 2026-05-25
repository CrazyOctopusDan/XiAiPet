const MERCHANT_API_BASE_URL_OVERRIDE_KEY = '__XIAIPET_MERCHANT_API_BASE_URL__';

declare const wx: any;

export const MERCHANT_API_PRODUCTION_BASE_URL = 'https://api.xiaipet.vip';
export const MERCHANT_API_DEVELOPMENT_BASE_URL = MERCHANT_API_PRODUCTION_BASE_URL;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getMerchantApiBaseUrl(): string {
  const override = (globalThis as unknown as Record<string, string | undefined>)[
    MERCHANT_API_BASE_URL_OVERRIDE_KEY
  ]?.trim();
  if (override) {
    return trimTrailingSlash(override);
  }

  const envVersion =
    typeof wx === 'undefined' ? undefined : wx.getAccountInfoSync?.()?.miniProgram?.envVersion;

  return envVersion === 'release' ? MERCHANT_API_PRODUCTION_BASE_URL : MERCHANT_API_DEVELOPMENT_BASE_URL;
}

export const MERCHANT_API_BASE_URL = getMerchantApiBaseUrl();
