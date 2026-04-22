import type { MerchantUserRecord } from '../types/user';

export function isMerchantUserRecord(value: unknown): value is MerchantUserRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.openid === 'string' &&
    typeof candidate.merchantId === 'string' &&
    typeof candidate.storeName === 'string' &&
    typeof candidate.enabled === 'boolean' &&
    typeof candidate.grantedAt === 'string'
  );
}
