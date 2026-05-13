import { merchantApiRequest, type MerchantApiRequester, type MerchantSessionAccount } from './api-client';

export interface MerchantAccountListResult {
  ok?: boolean;
  accounts: MerchantSessionAccount[];
}

export interface MerchantAccountWorkspaceSummary {
  total: number;
  staff: number;
  needsPasswordChange: number;
}

export interface MerchantAccountWorkspaceItem {
  id: string;
  username: string;
  initial: string;
  roleLabel: string;
  statusLabel: string;
  passwordLabel: string;
  statusTone: 'active' | 'disabled';
  canManage: boolean;
}

export interface MerchantAccountWorkspaceView {
  summary: MerchantAccountWorkspaceSummary;
  items: MerchantAccountWorkspaceItem[];
}

function getAccountInitial(username: string) {
  return username.trim().charAt(0).toUpperCase() || '?';
}

export function formatMerchantAccountWorkspace(accounts: MerchantSessionAccount[]): MerchantAccountWorkspaceView {
  return {
    summary: {
      total: accounts.length,
      staff: accounts.filter((account) => account.role === 'staff').length,
      needsPasswordChange: accounts.filter((account) => account.mustChangePassword).length
    },
    items: accounts.map((account) => {
      const isDisabled = account.status === 'disabled';

      return {
        id: account.id,
        username: account.username,
        initial: getAccountInitial(account.username),
        roleLabel: account.role === 'admin' ? '管理员' : '员工',
        statusLabel: isDisabled ? '停用' : '启用',
        passwordLabel: account.mustChangePassword ? '需改密' : '已改密',
        statusTone: isDisabled ? 'disabled' : 'active',
        canManage: account.role === 'staff' && !isDisabled
      };
    })
  };
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
