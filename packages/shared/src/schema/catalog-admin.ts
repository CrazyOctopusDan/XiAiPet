import type { OrderFulfillmentMode } from '../types/order';
import type {
  CatalogCategoryDeletePreflight,
  CatalogCategoryRecord,
  CatalogProductAdminRecord,
  CatalogProductEditorPayload,
  CatalogProductFormulaOption,
  CatalogProductPriceOverride,
  CatalogProductPublishSettings,
  CatalogProductSpecOption,
  CatalogPurchaseLimit
} from '../types/catalog-admin';
import { isAssetStorageId, isOssAssetReference } from './assets';

const PRODUCT_STATUSES = new Set(['draft', 'published', 'archived']);
const FULFILLMENT_MODES = new Set<OrderFulfillmentMode>(['delivery', 'pickup', 'express']);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isNonNegativeNumber(value);
}

function isShortIconToken(value: unknown): value is string {
  return isNonEmptyString(value) && Array.from(value.trim()).length <= 4;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalAssetReference(value: unknown) {
  return value === undefined || isOssAssetReference(value);
}

function isOptionalAssetReferenceArray(value: unknown) {
  return value === undefined || (Array.isArray(value) && value.every(isOssAssetReference));
}

function isOptionalBasicImageAssetArray(value: unknown) {
  return value === undefined || (Array.isArray(value) && value.length <= 3 && value.every(isOssAssetReference));
}

function isOptionalDetailImageAssetArray(value: unknown) {
  return value === undefined || (Array.isArray(value) && value.length <= 9 && value.every(isOssAssetReference));
}

function isMemberLevelId(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

function isCatalogProductSpecOption(value: unknown): value is CatalogProductSpecOption {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.label) &&
    isNonNegativeNumber(value.surcharge)
  );
}

function isCatalogProductFormulaOption(value: unknown): value is CatalogProductFormulaOption {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.label) &&
    isNonNegativeNumber(value.surcharge)
  );
}

function isCatalogProductPriceOverride(value: unknown): value is CatalogProductPriceOverride {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.specId) &&
    isNonEmptyString(value.formulaId) &&
    isNonNegativeNumber(value.price)
  );
}

function isCatalogPurchaseLimit(value: unknown): value is CatalogPurchaseLimit {
  if (!isObject(value) || typeof value.enabled !== 'boolean') {
    return false;
  }

  if (value.enabled) {
    return Number.isInteger(value.maxQuantity) && Number(value.maxQuantity) > 0;
  }

  return value.maxQuantity === null || (Number.isInteger(value.maxQuantity) && Number(value.maxQuantity) > 0);
}

function isFulfillmentModeArray(value: unknown): value is OrderFulfillmentMode[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === 'string' && FULFILLMENT_MODES.has(entry as OrderFulfillmentMode))
  );
}

function isCatalogProductPublishSettings(value: unknown): value is CatalogProductPublishSettings {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.status === 'string' &&
    PRODUCT_STATUSES.has(value.status) &&
    isFulfillmentModeArray(value.fulfillmentModes) &&
    typeof value.trackInventory === 'boolean'
  );
}

export function isCatalogCategoryRecord(value: unknown): value is CatalogCategoryRecord {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isShortIconToken(value.iconToken) &&
    isNonNegativeInteger(value.sortOrder) &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt)
  );
}

export function isCatalogCategoryDeletePreflight(value: unknown): value is CatalogCategoryDeletePreflight {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.categoryId) &&
    isNonNegativeInteger(value.linkedProductCount) &&
    typeof value.canDelete === 'boolean'
  );
}

export function isCatalogProductEditorPayload(value: unknown): value is CatalogProductEditorPayload {
  if (!isObject(value)) {
    return false;
  }

  const basicInfo = value.basicInfo;
  const pricing = value.pricing;
  const publishSettings = value.publishSettings;

  if (!isObject(basicInfo) || !isObject(pricing) || !isCatalogProductPublishSettings(publishSettings)) {
    return false;
  }

  return (
    isNonEmptyString(basicInfo.productId) &&
    isNonEmptyString(basicInfo.name) &&
    isNonEmptyString(basicInfo.description) &&
    isNonEmptyString(basicInfo.categoryId) &&
    !Array.isArray(basicInfo.categoryId) &&
    isAssetStorageId(basicInfo.imageFileId) &&
    isOptionalAssetReference(basicInfo.imageAsset) &&
    isOptionalString(basicInfo.imagePreviewUrl) &&
    isOptionalBasicImageAssetArray(basicInfo.introductionImageAssets) &&
    isOptionalDetailImageAssetArray(basicInfo.detailImageAssets) &&
    isMemberLevelId(basicInfo.memberLevelId) &&
    isNonNegativeInteger(basicInfo.stock) &&
    isNonNegativeNumber(pricing.basePrice) &&
    Array.isArray(pricing.specs) &&
    pricing.specs.every(isCatalogProductSpecOption) &&
    Array.isArray(pricing.formulas) &&
    pricing.formulas.every(isCatalogProductFormulaOption) &&
    Array.isArray(pricing.overrides) &&
    pricing.overrides.every(isCatalogProductPriceOverride) &&
    isCatalogPurchaseLimit(pricing.purchaseLimit) &&
    isNonEmptyString(pricing.detailContent)
  );
}

export function isCatalogProductAdminRecord(value: unknown): value is CatalogProductAdminRecord {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.description) &&
    isNonEmptyString(value.categoryId) &&
    !Array.isArray(value.categoryId) &&
    isAssetStorageId(value.imageFileId) &&
    isOptionalAssetReference(value.imageAsset) &&
    isOptionalString(value.imagePreviewUrl) &&
    isOptionalBasicImageAssetArray(value.introductionImageAssets) &&
    isOptionalDetailImageAssetArray(value.detailImageAssets) &&
    isMemberLevelId(value.memberLevelId) &&
    typeof value.status === 'string' &&
    PRODUCT_STATUSES.has(value.status) &&
    isNonNegativeInteger(value.sortOrder) &&
    isNonNegativeInteger(value.stock) &&
    typeof value.trackInventory === 'boolean' &&
    isFulfillmentModeArray(value.fulfillmentModes) &&
    isNonNegativeNumber(value.basePrice) &&
    Array.isArray(value.specs) &&
    value.specs.every(isCatalogProductSpecOption) &&
    Array.isArray(value.formulas) &&
    value.formulas.every(isCatalogProductFormulaOption) &&
    Array.isArray(value.priceOverrides) &&
    value.priceOverrides.every(isCatalogProductPriceOverride) &&
    isCatalogPurchaseLimit(value.purchaseLimit) &&
    isNonEmptyString(value.detailContent) &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt)
  );
}
