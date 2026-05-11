import crypto from 'node:crypto';

import type { ApiConfig } from '../../config/env';
import { ApiError } from '../../lib/errors';
import type { MerchantContext } from '../auth/types';
import {
  ASSET_ROLE_RULES,
  OSS_ASSET_ROLES,
  OSS_ASSET_VARIANTS,
  createOssObjectKey,
  createOssPostPolicy,
  getOssObjectUrl,
  type OssAssetRole,
  type OssAssetVariantName
} from './policy';

interface OssAssetVariant {
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

interface AssetUploadTokenPayload {
  merchantId: string;
  role: OssAssetRole;
  variantName: OssAssetVariantName;
  objectKey: string;
  maxSizeBytes: number;
  expiresAt: number;
}

export interface AssetUploadPolicyPayload {
  role: OssAssetRole;
  variantName: OssAssetVariantName;
  extension: string;
  contentType: string;
  sizeBytes: number;
}

export interface AssetConfirmUploadPayload {
  confirmToken: string;
  role: OssAssetRole;
  variantName: OssAssetVariantName;
  objectKey: string;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: string;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}

function signPayload(payloadPart: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadPart).digest('base64url');
}

function createConfirmToken(payload: AssetUploadTokenPayload, secret: string): string {
  const payloadPart = encodeJson(payload);
  return `${payloadPart}.${signPayload(payloadPart, secret)}`;
}

function verifyConfirmToken(token: string, secret: string): AssetUploadTokenPayload {
  try {
    const [payloadPart, signature] = token.split('.');
    if (!payloadPart || !signature) {
      throw new Error('malformed');
    }
    const expected = signPayload(payloadPart, secret);
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new Error('invalid');
    }
    return decodeJson<AssetUploadTokenPayload>(payloadPart);
  } catch {
    throw new ApiError('ASSET_UPLOAD_MISMATCH', 'Asset upload token is invalid', 400);
  }
}

function getMerchantId(merchantContext: MerchantContext): string {
  if (!merchantContext.merchantId) {
    throw new ApiError('MERCHANT_REQUIRED', 'Merchant access is required', 403);
  }
  return merchantContext.merchantId;
}

function getVariantRule(role: unknown, variantName: unknown) {
  if (
    typeof role !== 'string' ||
    !OSS_ASSET_ROLES.includes(role as OssAssetRole) ||
    typeof variantName !== 'string' ||
    !OSS_ASSET_VARIANTS.includes(variantName as OssAssetVariantName)
  ) {
    throw new ApiError('INVALID_ASSET_ROLE', 'Invalid asset role or variant', 400);
  }
  const typedRole = role as OssAssetRole;
  const typedVariantName = variantName as OssAssetVariantName;
  const rule = ASSET_ROLE_RULES[typedRole][typedVariantName];
  if (!rule) {
    throw new ApiError('INVALID_ASSET_VARIANT', 'Asset variant is not supported for this role', 400);
  }
  return { role: typedRole, variantName: typedVariantName, rule };
}

function assertImage(contentType: unknown): asserts contentType is string {
  if (typeof contentType !== 'string' || !contentType.startsWith('image/')) {
    throw new ApiError('INVALID_ASSET_TYPE', 'Only image uploads are supported', 400);
  }
}

function assertPositiveInteger(value: unknown, code: string, message: string): asserts value is number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new ApiError(code, message, 400);
  }
}

export function createAssetService(config: ApiConfig) {
  return {
    createUploadPolicy(
      merchantContext: MerchantContext,
      payload: AssetUploadPolicyPayload,
      now = new Date()
    ) {
      const merchantId = getMerchantId(merchantContext);
      const { role, variantName, rule } = getVariantRule(payload.role, payload.variantName);
      assertImage(payload.contentType);
      assertPositiveInteger(payload.sizeBytes, 'INVALID_ASSET_SIZE', 'Invalid asset size');
      if (payload.sizeBytes > rule.maxSizeBytes) {
        throw new ApiError('ASSET_TOO_LARGE', 'Asset exceeds size limit', 400);
      }

      const objectKey = createOssObjectKey({
        merchantId,
        role,
        variantName,
        extension: payload.extension,
        now
      });
      const expiresAt = new Date(now.getTime() + config.ossUploadPolicyTtlSeconds * 1000);
      const upload = createOssPostPolicy({
        config,
        objectKey,
        contentType: payload.contentType,
        maxSizeBytes: rule.maxSizeBytes,
        expiresAt
      });
      const tokenPayload: AssetUploadTokenPayload = {
        merchantId,
        role,
        variantName,
        objectKey,
        maxSizeBytes: rule.maxSizeBytes,
        expiresAt: Math.floor(expiresAt.getTime() / 1000)
      };

      return {
        ok: true as const,
        upload: {
          method: 'POST' as const,
          url: upload.url,
          fileFieldName: 'file',
          formData: upload.formData,
          objectKey,
          expiresAt: expiresAt.toISOString(),
          confirmToken: createConfirmToken(tokenPayload, config.sessionSecret)
        }
      };
    },

    confirmUpload(
      merchantContext: MerchantContext,
      payload: AssetConfirmUploadPayload,
      now = new Date()
    ) {
      const merchantId = getMerchantId(merchantContext);
      const { role, variantName, rule } = getVariantRule(payload.role, payload.variantName);
      assertImage(payload.contentType);
      assertPositiveInteger(payload.width, 'INVALID_ASSET_DIMENSIONS', 'Invalid asset dimensions');
      assertPositiveInteger(payload.height, 'INVALID_ASSET_DIMENSIONS', 'Invalid asset dimensions');
      assertPositiveInteger(payload.sizeBytes, 'INVALID_ASSET_SIZE', 'Invalid asset size');
      if (payload.sizeBytes > rule.maxSizeBytes) {
        throw new ApiError('ASSET_TOO_LARGE', 'Asset exceeds size limit', 400);
      }
      if (payload.width > rule.maxWidth || payload.height > rule.maxHeight) {
        throw new ApiError('ASSET_DIMENSIONS_TOO_LARGE', 'Asset dimensions exceed limit', 400);
      }

      const tokenPayload = verifyConfirmToken(payload.confirmToken, config.sessionSecret);
      const nowSeconds = Math.floor(now.getTime() / 1000);
      if (tokenPayload.expiresAt <= nowSeconds) {
        throw new ApiError('ASSET_UPLOAD_EXPIRED', 'Asset upload policy has expired', 400);
      }
      if (
        tokenPayload.merchantId !== merchantId ||
        tokenPayload.role !== role ||
        tokenPayload.variantName !== variantName ||
        tokenPayload.objectKey !== payload.objectKey ||
        tokenPayload.maxSizeBytes !== rule.maxSizeBytes
      ) {
        throw new ApiError('ASSET_UPLOAD_MISMATCH', 'Asset upload confirmation does not match policy', 400);
      }

      const url = getOssObjectUrl(config, payload.objectKey);
      const asset: OssAssetReference = {
        provider: 'oss',
        role,
        bucket: config.ossBucket,
        region: config.ossRegion,
        objectKey: payload.objectKey,
        url,
        width: payload.width,
        height: payload.height,
        sizeBytes: payload.sizeBytes,
        contentType: payload.contentType,
        uploadedAt: now.toISOString(),
        variants: [
          {
            name: variantName,
            objectKey: payload.objectKey,
            url,
            width: payload.width,
            height: payload.height,
            sizeBytes: payload.sizeBytes,
            contentType: payload.contentType
          }
        ]
      };

      return {
        ok: true as const,
        asset,
        storageId: `oss://${config.ossBucket}/${payload.objectKey}`
      };
    }
  };
}
