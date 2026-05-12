import { merchantApiRequest, type MerchantApiRequester } from './api-client';

export interface MerchantAccessResult {
  ok?: boolean;
  status?: 'allowed' | 'denied';
  allowed?: boolean;
  reason?: string;
  merchant?: {
    merchantId: string;
    storeName: string;
  };
  merchantUser?: unknown;
}

export async function verifyMerchantAccess(
  request: MerchantApiRequester = merchantApiRequest
): Promise<MerchantAccessResult> {
  return request<MerchantAccessResult>('/api/v1/merchant/access', {
    method: 'GET',
    auth: 'merchant'
  });
}
