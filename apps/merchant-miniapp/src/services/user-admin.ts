declare const wx: any;

import type {
  MerchantBalanceAdjustmentAction,
  MerchantBalanceLedgerEntry,
  MerchantBalanceAdjustmentReasonType,
  MerchantBalanceLedgerPage,
  MerchantLatestAdjustmentSummary,
  MerchantUserAddressItem,
  MerchantUserBalanceAdjustmentPayload,
  MerchantUserDetail,
  MerchantUserSearchInput,
  MerchantUserSearchListItem
} from '@xiaipet/shared/types/user-admin';

import { MerchantApiError, getMerchantSession, merchantApiRequest, type MerchantApiRequester } from './api-client';

export interface UserCardViewModel {
  openid: string;
  avatarUrl: string;
  nickname: string;
  contactPhoneLabel: string;
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

export type LatestAdjustmentSummary = MerchantLatestAdjustmentSummary;
export type UserDetailTabKey = 'basic' | 'addresses' | 'ledger';

export interface UserDetailTabViewModel {
  key: UserDetailTabKey;
  label: string;
  countLabel: string;
}

export interface UserDetailViewModel {
  openid: string;
  avatarUrl: string;
  nickname: string;
  membershipTierLabel: string;
  contactPhoneLabel: string;
  currentBalanceLabel: string;
  latestOperationTitle: string;
  latestOperationNote: string;
  latestOperationMeta: string;
  basicRows: UserBasicInfoRowViewModel[];
  addressRows: UserAddressViewModel[];
  ledgerRows: BalanceLedgerViewModel[];
  detailTabs: UserDetailTabViewModel[];
}

export interface UserBasicInfoRowViewModel {
  label: string;
  value: string;
}

export interface UserAddressViewModel {
  id: string;
  typeLabel: string;
  recipientLabel: string;
  phoneLabel: string;
  addressLabel: string;
  tagLabel: string;
  isDefault: boolean;
}

export interface BalanceLedgerViewModel {
  id: string;
  title: string;
  note: string;
  amountLabel: string;
  balanceAfterLabel: string;
  meta: string;
  tone: 'income' | 'expense' | 'neutral';
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
    const cache = wx.getStorageSync(USER_DETAIL_CACHE_KEY);

    if (!cache || typeof cache !== 'object' || Array.isArray(cache)) {
      return {};
    }

    return cache;
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

function getBalanceAdjustmentShortNote(delta: number) {
  if (delta > 0) {
    return `增加 ${formatMoney(delta)}`;
  }
  if (delta < 0) {
    return `扣减 ${formatMoney(Math.abs(delta))}`;
  }
  return '余额未变化';
}

function normalizeMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.floor(value * 100) / 100;
}

function normalizeBalanceAdjustmentAction(action: MerchantBalanceAdjustmentAction): MerchantBalanceAdjustmentAction {
  return action === 'deduct' ? 'deduct' : 'add';
}

function getContactPhoneLabel(user: Pick<MerchantUserSearchListItem, 'contactPhoneMasked' | 'contactPhone'>) {
  return user.contactPhone?.trim() || user.contactPhoneMasked || '未留手机号';
}

function getAmountTone(amount: number): BalanceLedgerViewModel['tone'] {
  if (amount > 0) {
    return 'income';
  }
  if (amount < 0) {
    return 'expense';
  }
  return 'neutral';
}

function getAmountLabel(amount: number) {
  if (amount > 0) {
    return `+${formatMoney(amount)}`;
  }
  if (amount < 0) {
    return `-${formatMoney(Math.abs(amount))}`;
  }
  return formatMoney(0);
}

export function getBalanceLedgerViewModels(ledgers: MerchantBalanceLedgerEntry[] = []): BalanceLedgerViewModel[] {
  return ledgers.map((ledger) => ({
    id: ledger.id,
    title: ledger.normalizedTitle,
    note: ledger.shortNote,
    amountLabel: getAmountLabel(ledger.amountDelta),
    balanceAfterLabel: `余额 ${formatMoney(ledger.balanceAfter)}`,
    meta: `${ledger.operatorName} · ${formatDateTime(ledger.operatedAt)}`,
    tone: getAmountTone(ledger.amountDelta)
  }));
}

export function getAddressViewModels(addresses: MerchantUserAddressItem[] = []): UserAddressViewModel[] {
  return addresses.map((address) => ({
    id: address.id,
    typeLabel: address.type === 'express' ? '快递地址' : '配送地址',
    recipientLabel: address.recipientName,
    phoneLabel: address.phoneNumber,
    addressLabel: `${address.regionLabel} ${address.detailAddress}`,
    tagLabel: address.tag || '未设置标签',
    isDefault: address.isDefault
  }));
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

export async function fetchMerchantUserDetail(openid: string, request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<{
    ok?: boolean;
    user?: MerchantUserDetail | null;
  }>(`/api/v1/merchant/users/${openid}`, {
    method: 'GET',
    auth: 'merchant'
  });

  return response.user ?? null;
}

export async function fetchMerchantUserAddresses(openid: string, request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<{
    ok?: boolean;
    addresses?: MerchantUserAddressItem[];
  }>(`/api/v1/merchant/users/${openid}/addresses`, {
    method: 'GET',
    auth: 'merchant'
  });

  return response.addresses ?? [];
}

export async function fetchMerchantUserBalanceLedgers(
  openid: string,
  pagination: { cursor?: string | null; limit?: number } = {},
  request: MerchantApiRequester = merchantApiRequest
): Promise<MerchantBalanceLedgerPage> {
  const response = await request<{
    ok?: boolean;
    records?: MerchantBalanceLedgerEntry[];
    pagination?: MerchantBalanceLedgerPage['pagination'];
  }>(`/api/v1/merchant/users/${openid}/balance-ledgers`, {
    method: 'GET',
    query: {
      cursor: pagination.cursor ?? '0',
      limit: String(pagination.limit ?? 20)
    },
    auth: 'merchant'
  });

  return {
    records: response.records ?? [],
    pagination: response.pagination ?? {
      nextCursor: null,
      hasMore: false,
      limit: pagination.limit ?? 20,
      total: response.records?.length ?? 0
    }
  };
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
      contactPhoneLabel: getContactPhoneLabel(user),
      membershipTierLabel: user.membershipTierLabel,
      currentBalanceLabel: formatMoney(user.currentBalance)
    }))
  };
}

export function getCachedLatestAdjustment(userOpenid: string) {
  return readUserDetailCache()[userOpenid] ?? null;
}

export function getUserDetailViewModel(
  user: MerchantUserSearchListItem | MerchantUserDetail,
  latest: LatestAdjustmentSummary | null
): UserDetailViewModel {
  const detailUser = user as MerchantUserDetail;
  const addressRows = getAddressViewModels(detailUser.addresses ?? []);
  const ledgerRows = getBalanceLedgerViewModels(detailUser.balanceLedgers ?? []);
  const addressCount = detailUser.addressCount ?? addressRows.length;
  const balanceLedgerCount = detailUser.balanceLedgerCount ?? ledgerRows.length;
  const contactPhoneLabel = getContactPhoneLabel(user);
  return {
    openid: user.openid,
    avatarUrl: user.avatarUrl,
    nickname: user.nickname,
    membershipTierLabel: user.membershipTierLabel,
    contactPhoneLabel,
    currentBalanceLabel: formatMoney(user.currentBalance),
    latestOperationTitle: latest?.normalizedTitle ?? '暂无最近操作',
    latestOperationNote: latest?.shortNote ?? '还没有余额调整记录',
    latestOperationMeta: latest ? `${latest.operatorName} · ${formatDateTime(latest.operatedAt)}` : '等待第一次调整',
    basicRows: [
      { label: '昵称', value: user.nickname },
      { label: '手机号', value: contactPhoneLabel },
      { label: '会员等级', value: user.membershipTierLabel }
    ],
    addressRows,
    ledgerRows,
    detailTabs: [
      { key: 'basic', label: '基本信息', countLabel: '3' },
      { key: 'addresses', label: '地址信息', countLabel: String(addressCount) },
      { key: 'ledger', label: '余额流水', countLabel: String(balanceLedgerCount) }
    ]
  };
}

export function buildBalanceAdjustmentDraft(
  user: MerchantUserSearchListItem,
  input: BalanceAdjustmentDraftInput
): BalanceAdjustmentDraft {
  const action = normalizeBalanceAdjustmentAction(input.action);
  const parsedAmount = Number(input.amountText || 0);
  const amount = normalizeMoney(parsedAmount);
  let delta = 0;
  let targetBalance = user.currentBalance;

  if (action === 'add') {
    delta = amount;
    targetBalance = user.currentBalance + amount;
  } else {
    delta = -amount;
    targetBalance = user.currentBalance - amount;
  }
  delta = normalizeMoney(delta);
  targetBalance = normalizeMoney(targetBalance);

  const disableSubmitReason =
    targetBalance < 0
      ? '调整后余额不能小于 0'
      : !input.note.trim()
        ? '请填写备注'
        : amount <= 0
          ? '请输入调整金额'
          : null;

  return {
    user,
    action,
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
    ledger?: {
      normalizedTitle?: string;
      shortNote?: string;
    };
  }>(`/api/v1/merchant/users/${draft.user.openid}/balance-adjustments`, {
    method: 'POST',
    body: payload,
    auth: 'merchant'
  });

  const responseLedger = response.ledger ?? {};
  const cache = readUserDetailCache();
  cache[draft.user.openid] = {
    normalizedTitle: responseLedger.normalizedTitle ?? draft.reasonType,
    shortNote: responseLedger.shortNote ?? getBalanceAdjustmentShortNote(draft.delta),
    operatedAt: payload.operatedAt,
    operatorName: operator.name
  };
  writeUserDetailCache(cache, storage);

  return response;
}
