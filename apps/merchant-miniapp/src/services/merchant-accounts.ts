import { merchantApiRequest, type MerchantApiRequester, type MerchantSessionAccount } from './api-client';

export interface MerchantAccountListResult {
  ok?: boolean;
  accounts: MerchantSessionAccount[];
}

export async function listMerchantAccounts(request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<MerchantAccountListResult>('/api/v1/merchant/accounts', {
    method: 'GET',
    auth: 'merchant'
  });
  return response.accounts ?? [];
}

export async function createStaffAccount(username: string, request: MerchantApiRequester = merchantApiRequest) {
  return request<{
    ok?: boolean;
    account: MerchantSessionAccount;
    initialPassword: string;
  }>('/api/v1/merchant/accounts/staff', {
    method: 'POST',
    body: { username },
    auth: 'merchant'
  });
}

export async function disableStaffAccount(accountId: string, request: MerchantApiRequester = merchantApiRequest) {
  return request<{
    ok?: boolean;
    account: MerchantSessionAccount;
  }>(`/api/v1/merchant/accounts/${accountId}/disable`, {
    method: 'PATCH',
    auth: 'merchant'
  });
}

export async function resetStaffPassword(accountId: string, request: MerchantApiRequester = merchantApiRequest) {
  return request<{
    ok?: boolean;
    account: MerchantSessionAccount;
    resetPassword: string;
  }>(`/api/v1/merchant/accounts/${accountId}/reset-password`, {
    method: 'POST',
    auth: 'merchant'
  });
}
