import crypto from 'node:crypto';

import type { ApiConfig } from '../../config/env';

export const OSS_ASSET_ROLES = [
  'product-cover',
  'product-introduction',
  'product-detail',
  'runtime-banner'
] as const;

export type OssAssetRole = (typeof OSS_ASSET_ROLES)[number];

export const OSS_ASSET_VARIANTS = ['thumbnail', 'display', 'detail', 'banner'] as const;

export type OssAssetVariantName = (typeof OSS_ASSET_VARIANTS)[number];

export interface AssetVariantRule {
  maxSizeBytes: number;
  maxWidth: number;
  maxHeight: number;
}

export const ASSET_ROLE_RULES: Record<OssAssetRole, Partial<Record<OssAssetVariantName, AssetVariantRule>>> = {
  'product-cover': {
    thumbnail: { maxSizeBytes: 184_320, maxWidth: 480, maxHeight: 480 },
    display: { maxSizeBytes: 460_800, maxWidth: 960, maxHeight: 960 }
  },
  'product-introduction': {
    display: { maxSizeBytes: 512_000, maxWidth: 960, maxHeight: 720 }
  },
  'product-detail': {
    detail: { maxSizeBytes: 716_800, maxWidth: 960, maxHeight: 1280 }
  },
  'runtime-banner': {
    banner: { maxSizeBytes: 665_600, maxWidth: 1280, maxHeight: 720 }
  }
};

export interface OssPostPolicyInput {
  config: ApiConfig;
  objectKey: string;
  contentType: string;
  maxSizeBytes: number;
  expiresAt: Date;
}

export interface OssPostPolicy {
  url: string;
  formData: {
    key: string;
    policy: string;
    OSSAccessKeyId: string;
    Signature: string;
    success_action_status: '200';
    'x-oss-object-acl': 'public-read';
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getOssObjectUrl(config: ApiConfig, objectKey: string): string {
  return `${normalizeBaseUrl(config.ossPublicBaseUrl)}/${objectKey}`;
}

export function createOssObjectKey(input: {
  merchantId: string;
  role: OssAssetRole;
  variantName: OssAssetVariantName;
  extension: string;
  now?: Date;
  assetId?: string;
}): string {
  const now = input.now ?? new Date();
  const year = String(now.getUTCFullYear());
  const safeExtension = input.extension.toLowerCase().replace(/^\./, '');
  const assetId = input.assetId ?? crypto.randomUUID();
  return `merchant/${input.merchantId}/assets/${input.role}/${year}/${assetId}-${input.variantName}.${safeExtension}`;
}

export function createOssPostPolicy(input: OssPostPolicyInput): OssPostPolicy {
  const expiration = input.expiresAt.toISOString();
  const policyDocument = {
    expiration,
    conditions: [
      { bucket: input.config.ossBucket },
      { key: input.objectKey },
      { success_action_status: '200' },
      { 'x-oss-object-acl': 'public-read' },
      ['content-length-range', 1, input.maxSizeBytes],
      ['starts-with', '$Content-Type', 'image/']
    ]
  };
  const policy = Buffer.from(JSON.stringify(policyDocument), 'utf8').toString('base64');
  const signature = crypto.createHmac('sha1', input.config.ossAccessKeySecret).update(policy).digest('base64');

  return {
    url: `https://${input.config.ossBucket}.${input.config.ossEndpoint}`,
    formData: {
      key: input.objectKey,
      policy,
      OSSAccessKeyId: input.config.ossAccessKeyId,
      Signature: signature,
      success_action_status: '200',
      'x-oss-object-acl': 'public-read'
    }
  };
}
