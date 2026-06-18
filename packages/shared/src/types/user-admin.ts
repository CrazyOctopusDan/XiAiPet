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
  contactPhone?: string;
  membershipTierLabel: string;
  currentBalance: number;
}

export interface MerchantLatestAdjustmentSummary {
  normalizedTitle: string;
  shortNote: string;
  operatedAt: string;
  operatorName: string;
}

export interface MerchantBalanceLedgerEntry extends MerchantLatestAdjustmentSummary {
  id: string;
  amountDelta: number;
  balanceBefore: number;
  balanceAfter: number;
}

export interface MerchantUserAddressItem {
  id: string;
  type: 'city' | 'express';
  recipientName: string;
  phoneNumber: string;
  regionLabel: string;
  detailAddress: string;
  tag: string;
  isDefault: boolean;
}

export interface MerchantUserPetItem {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'unknown';
  birthday: string;
  allergyNotes: string;
}

export interface MerchantUserDetail extends MerchantUserSearchListItem {
  latestAdjustment: MerchantLatestAdjustmentSummary | null;
  addressCount?: number;
  petCount?: number;
  balanceLedgerCount?: number;
  balanceLedgers: MerchantBalanceLedgerEntry[];
  addresses: MerchantUserAddressItem[];
  pets: MerchantUserPetItem[];
}

export interface MerchantBalanceLedgerPage {
  records: MerchantBalanceLedgerEntry[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
    total: number;
  };
}

export interface MerchantUserSearchResult {
  users: MerchantUserSearchListItem[];
}

export const MERCHANT_BALANCE_ADJUSTMENT_ACTIONS = ['add', 'deduct'] as const;
export type MerchantBalanceAdjustmentAction = (typeof MERCHANT_BALANCE_ADJUSTMENT_ACTIONS)[number];

export const MERCHANT_BALANCE_ADJUSTMENT_ADD_REASON_TYPES = [
  '充值',
  '线下收款',
  '赠送',
  '优惠券',
  '其他'
] as const;
export const MERCHANT_BALANCE_ADJUSTMENT_DEDUCT_REASON_TYPES = [
  '退款',
  '取消赠送',
  '其他'
] as const;
export const MERCHANT_BALANCE_ADJUSTMENT_REASON_TYPES = [
  ...MERCHANT_BALANCE_ADJUSTMENT_ADD_REASON_TYPES,
  ...MERCHANT_BALANCE_ADJUSTMENT_DEDUCT_REASON_TYPES
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
