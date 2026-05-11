import type { OssAssetReference, OssAssetRole, OssAssetVariant, OssAssetVariantName } from '../types/assets';
import { OSS_ASSET_ROLES, OSS_ASSET_VARIANTS } from '../types/assets';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

export function isOssAssetRole(value: unknown): value is OssAssetRole {
  return typeof value === 'string' && OSS_ASSET_ROLES.includes(value as OssAssetRole);
}

export function isOssAssetVariant(value: unknown): value is OssAssetVariantName {
  return typeof value === 'string' && OSS_ASSET_VARIANTS.includes(value as OssAssetVariantName);
}

export function isAssetStorageId(value: unknown): value is string {
  return isNonEmptyString(value) && (value.startsWith('cloud://') || value.startsWith('oss://'));
}

function isOssAssetVariantRecord(value: unknown): value is OssAssetVariant {
  if (!isObject(value)) {
    return false;
  }

  return (
    isOssAssetVariant(value.name) &&
    isNonEmptyString(value.objectKey) &&
    isNonEmptyString(value.url) &&
    isPositiveInteger(value.width) &&
    isPositiveInteger(value.height) &&
    isPositiveInteger(value.sizeBytes) &&
    isNonEmptyString(value.contentType) &&
    value.contentType.startsWith('image/')
  );
}

export function isOssAssetReference(value: unknown): value is OssAssetReference {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.provider === 'oss' &&
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
    value.variants.every(isOssAssetVariantRecord)
  );
}

export function getAssetUrlForVariant(
  asset: OssAssetReference | undefined,
  variantName: OssAssetVariantName
): string | undefined {
  if (!asset) {
    return undefined;
  }

  return asset.variants.find((variant) => variant.name === variantName)?.url ?? asset.url;
}
