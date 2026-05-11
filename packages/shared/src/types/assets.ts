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
