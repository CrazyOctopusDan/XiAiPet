"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCatalogCategoryRecord = isCatalogCategoryRecord;
exports.isCatalogCategoryDeletePreflight = isCatalogCategoryDeletePreflight;
exports.isCatalogProductEditorPayload = isCatalogProductEditorPayload;
exports.isCatalogProductAdminRecord = isCatalogProductAdminRecord;
const PRODUCT_STATUSES = new Set(['draft', 'published', 'archived']);
const FULFILLMENT_MODES = new Set(['delivery', 'pickup', 'express']);
function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function isNonNegativeNumber(value) {
    return isFiniteNumber(value) && value >= 0;
}
function isNonNegativeInteger(value) {
    return Number.isInteger(value) && isNonNegativeNumber(value);
}
function isShortIconToken(value) {
    return isNonEmptyString(value) && Array.from(value.trim()).length <= 4;
}
function isCloudBaseFileId(value) {
    return isNonEmptyString(value) && value.startsWith('cloud://');
}
function isOptionalString(value) {
    return value === undefined || typeof value === 'string';
}
function isMemberLevelId(value) {
    return value === null || isNonEmptyString(value);
}
function isCatalogProductSpecOption(value) {
    if (!isObject(value)) {
        return false;
    }
    return (isNonEmptyString(value.id) &&
        isNonEmptyString(value.label) &&
        isNonNegativeNumber(value.surcharge));
}
function isCatalogProductFormulaOption(value) {
    if (!isObject(value)) {
        return false;
    }
    return (isNonEmptyString(value.id) &&
        isNonEmptyString(value.label) &&
        isNonNegativeNumber(value.surcharge));
}
function isCatalogProductPriceOverride(value) {
    if (!isObject(value)) {
        return false;
    }
    return (isNonEmptyString(value.specId) &&
        isNonEmptyString(value.formulaId) &&
        isNonNegativeNumber(value.price));
}
function isCatalogPurchaseLimit(value) {
    if (!isObject(value) || typeof value.enabled !== 'boolean') {
        return false;
    }
    if (value.enabled) {
        return Number.isInteger(value.maxQuantity) && Number(value.maxQuantity) > 0;
    }
    return value.maxQuantity === null || (Number.isInteger(value.maxQuantity) && Number(value.maxQuantity) > 0);
}
function isFulfillmentModeArray(value) {
    return (Array.isArray(value) &&
        value.length > 0 &&
        value.every((entry) => typeof entry === 'string' && FULFILLMENT_MODES.has(entry)));
}
function isCatalogProductPublishSettings(value) {
    if (!isObject(value)) {
        return false;
    }
    return (typeof value.status === 'string' &&
        PRODUCT_STATUSES.has(value.status) &&
        isFulfillmentModeArray(value.fulfillmentModes) &&
        typeof value.trackInventory === 'boolean');
}
function isCatalogCategoryRecord(value) {
    if (!isObject(value)) {
        return false;
    }
    return (isNonEmptyString(value.id) &&
        isNonEmptyString(value.name) &&
        isShortIconToken(value.iconToken) &&
        isNonEmptyString(value.createdAt) &&
        isNonEmptyString(value.updatedAt));
}
function isCatalogCategoryDeletePreflight(value) {
    if (!isObject(value)) {
        return false;
    }
    return (isNonEmptyString(value.categoryId) &&
        isNonNegativeInteger(value.linkedProductCount) &&
        typeof value.canDelete === 'boolean');
}
function isCatalogProductEditorPayload(value) {
    if (!isObject(value)) {
        return false;
    }
    const basicInfo = value.basicInfo;
    const pricing = value.pricing;
    const publishSettings = value.publishSettings;
    if (!isObject(basicInfo) || !isObject(pricing) || !isCatalogProductPublishSettings(publishSettings)) {
        return false;
    }
    return (isNonEmptyString(basicInfo.productId) &&
        isNonEmptyString(basicInfo.name) &&
        isNonEmptyString(basicInfo.description) &&
        isNonEmptyString(basicInfo.categoryId) &&
        !Array.isArray(basicInfo.categoryId) &&
        isCloudBaseFileId(basicInfo.imageFileId) &&
        isOptionalString(basicInfo.imagePreviewUrl) &&
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
        isNonEmptyString(pricing.detailContent));
}
function isCatalogProductAdminRecord(value) {
    if (!isObject(value)) {
        return false;
    }
    return (isNonEmptyString(value.id) &&
        isNonEmptyString(value.name) &&
        isNonEmptyString(value.description) &&
        isNonEmptyString(value.categoryId) &&
        !Array.isArray(value.categoryId) &&
        isCloudBaseFileId(value.imageFileId) &&
        isOptionalString(value.imagePreviewUrl) &&
        isMemberLevelId(value.memberLevelId) &&
        typeof value.status === 'string' &&
        PRODUCT_STATUSES.has(value.status) &&
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
        isNonEmptyString(value.updatedAt));
}
