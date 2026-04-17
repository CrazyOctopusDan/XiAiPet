export const MERCHANT_USER_SEARCH_FIELDS = ['phone', 'name'] as const;
export type MerchantUserSearchField = (typeof MERCHANT_USER_SEARCH_FIELDS)[number];

export interface MerchantUserSearchInput {
  query: string;
  searchField: MerchantUserSearchField;
}

export interface MerchantUserSearchListItem {
  openid: string;
  avatarUrl: string;
  nickname: string;
  contactPhoneMasked: string;
  membershipTierLabel: string;
  currentBalance: number;
}

export interface MerchantUserSearchResult {
  users: MerchantUserSearchListItem[];
}

export const MERCHANT_BALANCE_ADJUSTMENT_ACTIONS = ['add', 'deduct', 'set'] as const;
export type MerchantBalanceAdjustmentAction = (typeof MERCHANT_BALANCE_ADJUSTMENT_ACTIONS)[number];

export const MERCHANT_BALANCE_ADJUSTMENT_REASON_TYPES = [
  '充值',
  '补偿',
  '人工纠错',
  '线下收款',
  '其他'
] as const;
export type MerchantBalanceAdjustmentReasonType =
  (typeof MERCHANT_BALANCE_ADJUSTMENT_REASON_TYPES)[number];

export interface MerchantBalanceAdjustmentOperator {
  openid: string;
  name: string;
}

export interface MerchantUserBalanceAdjustmentPayload {
  userOpenid: string;
  action: MerchantBalanceAdjustmentAction;
  reasonType: MerchantBalanceAdjustmentReasonType;
  note: string;
  operator: MerchantBalanceAdjustmentOperator;
  operatedAt: string;
  beforeBalance: number;
  delta: number;
  targetBalance: number;
  afterBalance: number;
  requiresConfirmation: true;
}
