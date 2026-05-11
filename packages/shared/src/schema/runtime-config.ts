import type {
  BannerRuntimeConfigSection,
  CustomNoticeRuntimeConfigSection,
  DeliveryRuleTierRow,
  DeliveryRulesRuntimeConfigSection,
  MembershipTierConfig,
  MembershipTiersRuntimeConfigSection,
  RuntimeConfigSectionDocument,
  RuntimeConfigUpdatedBy,
  StoreProfileRuntimeConfigSection
} from '../types/runtime-config';
import { RUNTIME_CONFIG_SECTION_IDS } from '../types/runtime-config';
import { isAssetStorageId, isOssAssetReference } from './assets';

export const LOCKED_DELIVERY_RULE_ROWS: DeliveryRuleTierRow[] = [
  { distanceKm: 5, minimumOrderAmount: 98, deliveryFee: 0, explainer: '5.0 公里内 98 元起送，配送费 0 元' },
  { distanceKm: 10, minimumOrderAmount: 98, deliveryFee: 15, explainer: '10.0 公里内 98 元起送，配送费 15 元' },
  { distanceKm: 15, minimumOrderAmount: null, deliveryFee: 25, explainer: '15.0 公里内，配送费 25 元' },
  { distanceKm: 20, minimumOrderAmount: null, deliveryFee: 40, explainer: '20.0 公里内，配送费 40 元' },
  { distanceKm: 25, minimumOrderAmount: null, deliveryFee: 50, explainer: '25.0 公里内，配送费 50 元' },
  { distanceKm: 30, minimumOrderAmount: null, deliveryFee: 60, explainer: '30.0 公里内，配送费 60 元' },
  { distanceKm: 35, minimumOrderAmount: null, deliveryFee: 65, explainer: '35.0 公里内，配送费 65 元' },
  { distanceKm: 40, minimumOrderAmount: null, deliveryFee: 70, explainer: '40.0 公里内，配送费 70 元' },
  { distanceKm: 45, minimumOrderAmount: null, deliveryFee: 75, explainer: '45.0 公里内，配送费 75 元' },
  { distanceKm: 50, minimumOrderAmount: null, deliveryFee: 80, explainer: '50.0 公里内，配送费 80 元' }
];

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const valueKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();

  return (
    valueKeys.length === expectedKeys.length &&
    valueKeys.every((key, index) => key === expectedKeys[index])
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRuntimeConfigUpdatedBy(value: unknown): value is RuntimeConfigUpdatedBy {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['openid', 'name']) &&
    isNonEmptyString(value.openid) &&
    isNonEmptyString(value.name)
  );
}

function hasRuntimeConfigMeta(
  value: Record<string, unknown>,
  sectionId: RuntimeConfigSectionDocument['sectionId']
) {
  return (
    value.sectionId === sectionId &&
    isNonEmptyString(value.updatedAt) &&
    isRuntimeConfigUpdatedBy(value.updatedBy)
  );
}

function isStoreProfileValue(value: unknown) {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['address', 'latitude', 'longitude', 'contactPhone']) &&
    isNonEmptyString(value.address) &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    isNonEmptyString(value.contactPhone)
  );
}

function isLockedDeliveryRuleRow(value: unknown, index: number) {
  if (!isObject(value)) {
    return false;
  }

  const expected = LOCKED_DELIVERY_RULE_ROWS[index];
  return (
    hasOnlyKeys(value, ['distanceKm', 'minimumOrderAmount', 'deliveryFee', 'explainer']) &&
    value.distanceKm === expected.distanceKm &&
    value.minimumOrderAmount === expected.minimumOrderAmount &&
    value.deliveryFee === expected.deliveryFee &&
    value.explainer === expected.explainer
  );
}

function isMembershipTierConfig(value: unknown): value is MembershipTierConfig {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['tierId', 'threshold', 'name', 'description']) &&
    isNonEmptyString(value.tierId) &&
    isFiniteNumber(value.threshold) &&
    value.threshold >= 0 &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.description)
  );
}

function isBannerValue(value: unknown) {
  if (!isObject(value)) {
    return false;
  }

  return (
    (hasOnlyKeys(value, ['fileId', 'altText']) || hasOnlyKeys(value, ['fileId', 'altText', 'asset'])) &&
    isAssetStorageId(value.fileId) &&
    isNonEmptyString(value.altText) &&
    (value.asset === undefined || isOssAssetReference(value.asset))
  );
}

function isCustomNoticeValue(value: unknown) {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['enabled', 'content']) &&
    typeof value.enabled === 'boolean' &&
    isNonEmptyString(value.content)
  );
}

export function isRuntimeConfigSectionDocument(value: unknown): value is RuntimeConfigSectionDocument {
  if (!isObject(value) || typeof value.sectionId !== 'string') {
    return false;
  }

  if (!RUNTIME_CONFIG_SECTION_IDS.includes(value.sectionId as RuntimeConfigSectionDocument['sectionId'])) {
    return false;
  }

  if (value.sectionId === 'store-profile') {
    return isStoreProfileRuntimeConfigSection(value);
  }

  if (value.sectionId === 'delivery-rules') {
    return isDeliveryRulesRuntimeConfigSection(value);
  }

  if (value.sectionId === 'membership-tiers') {
    return isMembershipTiersRuntimeConfigSection(value);
  }

  if (value.sectionId === 'banner') {
    return isBannerRuntimeConfigSection(value);
  }

  return isCustomNoticeRuntimeConfigSection(value);
}

export function isStoreProfileRuntimeConfigSection(value: unknown): value is StoreProfileRuntimeConfigSection {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
    hasRuntimeConfigMeta(value, 'store-profile') &&
    isStoreProfileValue(value.value)
  );
}

export function isDeliveryRulesRuntimeConfigSection(value: unknown): value is DeliveryRulesRuntimeConfigSection {
  if (!isObject(value) || !isObject(value.value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
    hasRuntimeConfigMeta(value, 'delivery-rules') &&
    hasOnlyKeys(value.value, ['tiers']) &&
    Array.isArray(value.value.tiers) &&
    value.value.tiers.length === LOCKED_DELIVERY_RULE_ROWS.length &&
    value.value.tiers.every((tier, index) => isLockedDeliveryRuleRow(tier, index))
  );
}

export function isMembershipTiersRuntimeConfigSection(
  value: unknown
): value is MembershipTiersRuntimeConfigSection {
  if (!isObject(value) || !isObject(value.value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
    hasRuntimeConfigMeta(value, 'membership-tiers') &&
    hasOnlyKeys(value.value, ['tiers']) &&
    Array.isArray(value.value.tiers) &&
    value.value.tiers.length > 0 &&
    value.value.tiers.every((tier) => isMembershipTierConfig(tier))
  );
}

export function isBannerRuntimeConfigSection(value: unknown): value is BannerRuntimeConfigSection {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
    hasRuntimeConfigMeta(value, 'banner') &&
    isBannerValue(value.value)
  );
}

export function isCustomNoticeRuntimeConfigSection(value: unknown): value is CustomNoticeRuntimeConfigSection {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
    hasRuntimeConfigMeta(value, 'custom-notice') &&
    isCustomNoticeValue(value.value)
  );
}
