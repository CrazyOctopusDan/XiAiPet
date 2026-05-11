"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCKED_DELIVERY_RULE_ROWS = void 0;
exports.isRuntimeConfigSectionDocument = isRuntimeConfigSectionDocument;
exports.isStoreProfileRuntimeConfigSection = isStoreProfileRuntimeConfigSection;
exports.isDeliveryRulesRuntimeConfigSection = isDeliveryRulesRuntimeConfigSection;
exports.isMembershipTiersRuntimeConfigSection = isMembershipTiersRuntimeConfigSection;
exports.isBannerRuntimeConfigSection = isBannerRuntimeConfigSection;
exports.isCustomNoticeRuntimeConfigSection = isCustomNoticeRuntimeConfigSection;
const runtime_config_1 = require("../types/runtime-config");
const assets_1 = require("./assets");
exports.LOCKED_DELIVERY_RULE_ROWS = [
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
function hasOnlyKeys(value, keys) {
    const valueKeys = Object.keys(value).sort();
    const expectedKeys = [...keys].sort();
    return (valueKeys.length === expectedKeys.length &&
        valueKeys.every((key, index) => key === expectedKeys[index]));
}
function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function isRuntimeConfigUpdatedBy(value) {
    if (!isObject(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['openid', 'name']) &&
        isNonEmptyString(value.openid) &&
        isNonEmptyString(value.name));
}
function hasRuntimeConfigMeta(value, sectionId) {
    return (value.sectionId === sectionId &&
        isNonEmptyString(value.updatedAt) &&
        isRuntimeConfigUpdatedBy(value.updatedBy));
}
function isStoreProfileValue(value) {
    if (!isObject(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['address', 'latitude', 'longitude', 'contactPhone']) &&
        isNonEmptyString(value.address) &&
        isFiniteNumber(value.latitude) &&
        isFiniteNumber(value.longitude) &&
        isNonEmptyString(value.contactPhone));
}
function isLockedDeliveryRuleRow(value, index) {
    if (!isObject(value)) {
        return false;
    }
    const expected = exports.LOCKED_DELIVERY_RULE_ROWS[index];
    return (hasOnlyKeys(value, ['distanceKm', 'minimumOrderAmount', 'deliveryFee', 'explainer']) &&
        value.distanceKm === expected.distanceKm &&
        value.minimumOrderAmount === expected.minimumOrderAmount &&
        value.deliveryFee === expected.deliveryFee &&
        value.explainer === expected.explainer);
}
function isMembershipTierConfig(value) {
    if (!isObject(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['tierId', 'threshold', 'name', 'description']) &&
        isNonEmptyString(value.tierId) &&
        isFiniteNumber(value.threshold) &&
        value.threshold >= 0 &&
        isNonEmptyString(value.name) &&
        isNonEmptyString(value.description));
}
function isBannerValue(value) {
    if (!isObject(value)) {
        return false;
    }
    return ((hasOnlyKeys(value, ['fileId', 'altText']) || hasOnlyKeys(value, ['fileId', 'altText', 'asset'])) &&
        (0, assets_1.isAssetStorageId)(value.fileId) &&
        isNonEmptyString(value.altText) &&
        (value.asset === undefined || (0, assets_1.isOssAssetReference)(value.asset)));
}
function isCustomNoticeValue(value) {
    if (!isObject(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['enabled', 'content']) &&
        typeof value.enabled === 'boolean' &&
        isNonEmptyString(value.content));
}
function isRuntimeConfigSectionDocument(value) {
    if (!isObject(value) || typeof value.sectionId !== 'string') {
        return false;
    }
    if (!runtime_config_1.RUNTIME_CONFIG_SECTION_IDS.includes(value.sectionId)) {
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
function isStoreProfileRuntimeConfigSection(value) {
    if (!isObject(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
        hasRuntimeConfigMeta(value, 'store-profile') &&
        isStoreProfileValue(value.value));
}
function isDeliveryRulesRuntimeConfigSection(value) {
    if (!isObject(value) || !isObject(value.value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
        hasRuntimeConfigMeta(value, 'delivery-rules') &&
        hasOnlyKeys(value.value, ['tiers']) &&
        Array.isArray(value.value.tiers) &&
        value.value.tiers.length === exports.LOCKED_DELIVERY_RULE_ROWS.length &&
        value.value.tiers.every((tier, index) => isLockedDeliveryRuleRow(tier, index)));
}
function isMembershipTiersRuntimeConfigSection(value) {
    if (!isObject(value) || !isObject(value.value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
        hasRuntimeConfigMeta(value, 'membership-tiers') &&
        hasOnlyKeys(value.value, ['tiers']) &&
        Array.isArray(value.value.tiers) &&
        value.value.tiers.length > 0 &&
        value.value.tiers.every((tier) => isMembershipTierConfig(tier)));
}
function isBannerRuntimeConfigSection(value) {
    if (!isObject(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
        hasRuntimeConfigMeta(value, 'banner') &&
        isBannerValue(value.value));
}
function isCustomNoticeRuntimeConfigSection(value) {
    if (!isObject(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ['sectionId', 'updatedAt', 'updatedBy', 'value']) &&
        hasRuntimeConfigMeta(value, 'custom-notice') &&
        isCustomNoticeValue(value.value));
}
