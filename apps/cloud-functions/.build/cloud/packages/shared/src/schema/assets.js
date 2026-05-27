"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeImageUrlForDisplay = void 0;
exports.isOssAssetRole = isOssAssetRole;
exports.isOssAssetVariant = isOssAssetVariant;
exports.isAssetStorageId = isAssetStorageId;
exports.isOssAssetReference = isOssAssetReference;
exports.getAssetUrlForVariant = getAssetUrlForVariant;
const assets_1 = require("../types/assets");
Object.defineProperty(exports, "normalizeImageUrlForDisplay", { enumerable: true, get: function () { return assets_1.normalizeImageUrlForDisplay; } });
function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function isPositiveInteger(value) {
    return Number.isInteger(value) && Number(value) > 0;
}
function isOssAssetRole(value) {
    return typeof value === 'string' && assets_1.OSS_ASSET_ROLES.includes(value);
}
function isOssAssetVariant(value) {
    return typeof value === 'string' && assets_1.OSS_ASSET_VARIANTS.includes(value);
}
function isAssetStorageId(value) {
    return isNonEmptyString(value) && (value.startsWith('cloud://') || value.startsWith('oss://'));
}
function isOssAssetVariantRecord(value) {
    if (!isObject(value)) {
        return false;
    }
    return (isOssAssetVariant(value.name) &&
        isNonEmptyString(value.objectKey) &&
        isNonEmptyString(value.url) &&
        isPositiveInteger(value.width) &&
        isPositiveInteger(value.height) &&
        isPositiveInteger(value.sizeBytes) &&
        isNonEmptyString(value.contentType) &&
        value.contentType.startsWith('image/'));
}
function isOssAssetReference(value) {
    if (!isObject(value)) {
        return false;
    }
    return (value.provider === 'oss' &&
        isOssAssetRole(value.role) &&
        isNonEmptyString(value.bucket) &&
        isNonEmptyString(value.region) &&
        isNonEmptyString(value.objectKey) &&
        isNonEmptyString(value.url) &&
        isPositiveInteger(value.width) &&
        isPositiveInteger(value.height) &&
        isPositiveInteger(value.sizeBytes) &&
        isNonEmptyString(value.contentType) &&
        value.contentType.startsWith('image/') &&
        isNonEmptyString(value.uploadedAt) &&
        Array.isArray(value.variants) &&
        value.variants.length > 0 &&
        value.variants.every(isOssAssetVariantRecord));
}
function getAssetUrlForVariant(asset, variantName) {
    if (!asset) {
        return undefined;
    }
    return asset.variants.find((variant) => variant.name === variantName)?.url ?? asset.url;
}
