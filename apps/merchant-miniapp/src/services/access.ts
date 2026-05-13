import { merchantApiRequest, MerchantApiError, type MerchantApiRequester } from './api-client';
import type { MerchantSessionAccount } from './api-client';

export interface MerchantAccessResult {
  ok?: boolean;
  status?: 'allowed' | 'denied';
  allowed?: boolean;
  reason?: string;
  merchant?: {
    merchantId: string;
    storeName: string;
  };
  account?: MerchantSessionAccount | null;
  merchantUser?: unknown;
}

export async function verifyMerchantAccess(
  request: MerchantApiRequester = merchantApiRequest
): Promise<MerchantAccessResult> {
  try {
    return await request<MerchantAccessResult>('/api/v1/merchant/access', {
      method: 'GET',
      auth: 'merchant'
    });
  } catch (error) {
    if (error instanceof MerchantApiError && (error.statusCode === 403 || error.code === 'MERCHANT_FORBIDDEN')) {
      return {
        ok: true,
        status: 'denied',
        allowed: false,
        reason: error.message || '当前账号没有商户权限'
      };
    }

    throw error;
  }
}
