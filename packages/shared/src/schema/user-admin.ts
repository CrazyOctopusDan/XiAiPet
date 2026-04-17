import type {
  MerchantBalanceAdjustmentOperator,
  MerchantUserBalanceAdjustmentPayload,
  MerchantUserSearchInput,
  MerchantUserSearchListItem,
  MerchantUserSearchResult
} from '../types/user-admin';
import {
  MERCHANT_BALANCE_ADJUSTMENT_ACTIONS,
  MERCHANT_BALANCE_ADJUSTMENT_REASON_TYPES,
  MERCHANT_USER_SEARCH_FIELDS
} from '../types/user-admin';

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const valueKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();

  return (
    valueKeys.length === expectedKeys.length &&
    valueKeys.every((key, index) => key === expectedKeys[index])
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteBalance(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function toMinorUnits(value: number): number {
  return Math.round(value * 100);
}

function isMerchantBalanceAdjustmentOperator(
  value: unknown
): value is MerchantBalanceAdjustmentOperator {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    hasOnlyKeys(candidate, ['openid', 'name']) &&
    isNonEmptyString(candidate.openid) &&
    isNonEmptyString(candidate.name)
  );
}

function isMerchantUserSearchListItem(value: unknown): value is MerchantUserSearchListItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    hasOnlyKeys(candidate, [
      'openid',
      'avatarUrl',
      'nickname',
      'contactPhoneMasked',
      'membershipTierLabel',
      'currentBalance'
    ]) &&
    isNonEmptyString(candidate.openid) &&
    isNonEmptyString(candidate.avatarUrl) &&
    isNonEmptyString(candidate.nickname) &&
    isNonEmptyString(candidate.contactPhoneMasked) &&
    isNonEmptyString(candidate.membershipTierLabel) &&
    isFiniteBalance(candidate.currentBalance)
  );
}

export function isMerchantUserSearchInput(value: unknown): value is MerchantUserSearchInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    hasOnlyKeys(candidate, ['query', 'searchField']) &&
    isNonEmptyString(candidate.query) &&
    MERCHANT_USER_SEARCH_FIELDS.includes(
      candidate.searchField as (typeof MERCHANT_USER_SEARCH_FIELDS)[number]
    )
  );
}

export function isMerchantUserSearchResult(value: unknown): value is MerchantUserSearchResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    hasOnlyKeys(candidate, ['users']) &&
    Array.isArray(candidate.users) &&
    candidate.users.every((item) => isMerchantUserSearchListItem(item))
  );
}

export function isMerchantUserBalanceAdjustmentPayload(
  value: unknown
): value is MerchantUserBalanceAdjustmentPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    !hasOnlyKeys(candidate, [
      'userOpenid',
      'action',
      'reasonType',
      'note',
      'operator',
      'operatedAt',
      'beforeBalance',
      'delta',
      'targetBalance',
      'afterBalance',
      'requiresConfirmation'
    ]) ||
    !isNonEmptyString(candidate.userOpenid) ||
    !MERCHANT_BALANCE_ADJUSTMENT_ACTIONS.includes(
      candidate.action as (typeof MERCHANT_BALANCE_ADJUSTMENT_ACTIONS)[number]
    ) ||
    !MERCHANT_BALANCE_ADJUSTMENT_REASON_TYPES.includes(
      candidate.reasonType as (typeof MERCHANT_BALANCE_ADJUSTMENT_REASON_TYPES)[number]
    ) ||
    !isNonEmptyString(candidate.note) ||
    !isMerchantBalanceAdjustmentOperator(candidate.operator) ||
    !isNonEmptyString(candidate.operatedAt) ||
    !isFiniteBalance(candidate.beforeBalance) ||
    typeof candidate.delta !== 'number' ||
    !Number.isFinite(candidate.delta) ||
    !isFiniteBalance(candidate.targetBalance) ||
    !isFiniteBalance(candidate.afterBalance) ||
    candidate.requiresConfirmation !== true
  ) {
    return false;
  }

  const beforeBalance = toMinorUnits(candidate.beforeBalance);
  const delta = toMinorUnits(candidate.delta);
  const targetBalance = toMinorUnits(candidate.targetBalance);
  const afterBalance = toMinorUnits(candidate.afterBalance);

  if (targetBalance !== afterBalance || beforeBalance + delta !== targetBalance) {
    return false;
  }

  if (candidate.action === 'add') {
    return delta > 0 && targetBalance >= beforeBalance;
  }

  if (candidate.action === 'deduct') {
    return delta < 0 && targetBalance <= beforeBalance;
  }

  return targetBalance === afterBalance && delta === targetBalance - beforeBalance;
}
