export const OSS_ASSET_ROLES = [
  'product-cover',
  'product-introduction',
  'product-detail',
  'runtime-banner'
] as const;

export type OssAssetRole = (typeof OSS_ASSET_ROLES)[number];

export const OSS_ASSET_VARIANTS = ['thumbnail', 'display', 'detail', 'banner'] as const;

export type OssAssetVariantName = (typeof OSS_ASSET_VARIANTS)[number];

export interface OssAssetVariant {
  name: OssAssetVariantName;
  objectKey: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: string;
}

export interface OssAssetReference {
  provider: 'oss';
  role: OssAssetRole;
  bucket: string;
  region: string;
  objectKey: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
  variants: OssAssetVariant[];
}

export function normalizeImageUrlForDisplay(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('cloud://') ||
    trimmed.startsWith('oss://') ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  ) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, '')}`;
}
