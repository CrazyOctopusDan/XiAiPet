declare const wx: any;

import type {
  MerchantBalanceAdjustmentAction,
  MerchantBalanceAdjustmentReasonType,
  MerchantUserBalanceAdjustmentPayload,
  MerchantUserSearchInput,
  MerchantUserSearchListItem
} from '@xiaipet/shared/types/user-admin';

import { MerchantApiError, getMerchantSession, merchantApiRequest, type MerchantApiRequester } from './api-client';

export interface UserCardViewModel {
  openid: string;
  avatarUrl: string;
  nickname: string;
  contactPhoneMasked: string;
  membershipTierLabel: string;
  currentBalanceLabel: string;
}

export interface UsersPageSummaryViewModel {
  totalUsers: number;
  totalBalanceLabel: string;
  tierCount: number;
}

export interface UsersPageViewModel {
  isEmpty: boolean;
  summary: UsersPageSummaryViewModel;
  cards: UserCardViewModel[];
}

export interface LatestAdjustmentSummary {
  normalizedTitle: string;
  shortNote: string;
  operatedAt: string;
  operatorName: string;
}

export interface UserDetailViewModel {
  openid: string;
  avatarUrl: string;
  nickname: string;
  membershipTierLabel: string;
  contactPhoneMasked: string;
  currentBalanceLabel: string;
  latestOperationTitle: string;
  latestOperationNote: string;
  latestOperationMeta: string;
}

export interface BalanceAdjustmentDraftInput {
  action: MerchantBalanceAdjustmentAction;
  amountText: string;
  reasonType: MerchantBalanceAdjustmentReasonType;
  note: string;
}

export interface BalanceAdjustmentDraft {
  user: MerchantUserSearchListItem;
  action: MerchantBalanceAdjustmentAction;
  amountText: string;
  amount: number;
  reasonType: MerchantBalanceAdjustmentReasonType;
  note: string;
  beforeBalance: number;
  delta: number;
  targetBalance: number;
  afterBalance: number;
  resultingBalanceLabel: string;
  disableSubmitReason: string | null;
}

const USER_DETAIL_CACHE_KEY = 'merchant-user-detail-cache';

function formatMoney(value: number) {
  return `￥${value.toFixed(2)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}-${day} ${hours}:${minutes}`;
}

function readUserDetailCache(): Record<string, LatestAdjustmentSummary> {
  try {
    return wx.getStorageSync(USER_DETAIL_CACHE_KEY) ?? {};
  } catch (error) {
    return {};
  }
}

function writeUserDetailCache(cache: Record<string, LatestAdjustmentSummary>, storage?: (key: string, value: unknown) => void) {
  if (storage) {
    storage(USER_DETAIL_CACHE_KEY, cache);
    return;
  }

  wx.setStorageSync(USER_DETAIL_CACHE_KEY, cache);
}

function getCurrentMerchantOperator() {
  const account = getMerchantSession()?.account;
  if (!account?.id || !account.username) {
    throw new MerchantApiError('MERCHANT_LOGIN_REQUIRED', '请先登录商户账号', 401);
  }

  return {
    openid: account.id,
    name: account.username
  };
}

export async function queryMerchantUsers(input: MerchantUserSearchInput, request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<{
    ok?: boolean;
    users?: MerchantUserSearchListItem[];
  }>('/api/v1/merchant/users', {
    method: 'GET',
    query: {
      query: input.query,
      searchField: input.searchField
    },
    auth: 'merchant'
  });

  return response.users ?? [];
}

export function getUsersPageViewModel(users: MerchantUserSearchListItem[]): UsersPageViewModel {
  return {
    isEmpty: users.length === 0,
    summary: {
      totalUsers: users.length,
      totalBalanceLabel: formatMoney(users.reduce((sum, user) => sum + user.currentBalance, 0)),
      tierCount: new Set(users.map((user) => user.membershipTierLabel)).size
    },
    cards: users.map((user) => ({
      openid: user.openid,
      avatarUrl: user.avatarUrl,
      nickname: user.nickname,
      contactPhoneMasked: user.contactPhoneMasked,
      membershipTierLabel: user.membershipTierLabel,
      currentBalanceLabel: formatMoney(user.currentBalance)
    }))
  };
}

export function getCachedLatestAdjustment(userOpenid: string) {
  return readUserDetailCache()[userOpenid] ?? null;
}

export function getUserDetailViewModel(user: MerchantUserSearchListItem, latest: LatestAdjustmentSummary | null): UserDetailViewModel {
  return {
    openid: user.openid,
    avatarUrl: user.avatarUrl,
    nickname: user.nickname,
    membershipTierLabel: user.membershipTierLabel,
    contactPhoneMasked: user.contactPhoneMasked,
    currentBalanceLabel: formatMoney(user.currentBalance),
    latestOperationTitle: latest?.normalizedTitle ?? '暂无最近操作',
    latestOperationNote: latest?.shortNote ?? '还没有余额调整记录',
    latestOperationMeta: latest ? `${latest.operatorName} · ${formatDateTime(latest.operatedAt)}` : '等待第一次调整'
  };
}

export function buildBalanceAdjustmentDraft(
  user: MerchantUserSearchListItem,
  input: BalanceAdjustmentDraftInput
): BalanceAdjustmentDraft {
  const parsedAmount = Number(input.amountText || 0);
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  let delta = 0;
  let targetBalance = user.currentBalance;

  if (input.action === 'add') {
    delta = amount;
    targetBalance = user.currentBalance + amount;
  } else if (input.action === 'deduct') {
    delta = -amount;
    targetBalance = user.currentBalance - amount;
  } else {
    targetBalance = amount;
    delta = amount - user.currentBalance;
  }

  const disableSubmitReason =
    targetBalance < 0
      ? '调整后余额不能小于 0'
      : !input.note.trim()
        ? '请填写备注'
        : amount <= 0
          ? input.action === 'set'
            ? '请输入目标余额'
            : '请输入调整金额'
          : null;

  return {
    user,
    action: input.action,
    amountText: input.amountText,
    amount,
    reasonType: input.reasonType,
    note: input.note,
    beforeBalance: user.currentBalance,
    delta,
    targetBalance,
    afterBalance: targetBalance,
    resultingBalanceLabel: formatMoney(targetBalance),
    disableSubmitReason
  };
}

export async function submitBalanceAdjustment(
  draft: BalanceAdjustmentDraft,
  request: MerchantApiRequester = merchantApiRequest,
  storage?: (key: string, value: unknown) => void
) {
  const operator = getCurrentMerchantOperator();

  const payload: MerchantUserBalanceAdjustmentPayload = {
    userOpenid: draft.user.openid,
    action: draft.action,
    reasonType: draft.reasonType,
    note: draft.note.trim(),
    operator,
    operatedAt: new Date().toISOString(),
    beforeBalance: draft.beforeBalance,
    delta: draft.delta,
    targetBalance: draft.targetBalance,
    afterBalance: draft.afterBalance,
    requiresConfirmation: true
  };

  const response = await request<{
    ok?: boolean;
    balanceAfter: number;
    ledger: {
      normalizedTitle: string;
      shortNote: string;
    };
  }>(`/api/v1/merchant/users/${draft.user.openid}/balance-adjustments`, {
    method: 'POST',
    body: payload,
    auth: 'merchant'
  });

  const cache = readUserDetailCache();
  cache[draft.user.openid] = {
    normalizedTitle: response.ledger.normalizedTitle,
    shortNote: response.ledger.shortNote,
    operatedAt: payload.operatedAt,
    operatorName: operator.name
  };
  writeUserDetailCache(cache, storage);

  return response;
}
